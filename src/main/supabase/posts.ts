import { getSupabaseClient } from './client';
import * as https from 'https';

// Helper to convert camelCase to snake_case
function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// Helper to convert snake_case to camelCase
function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

// ============ SUBREDDITS ============

export async function listSubreddits(modelId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('subreddits')
    .select('*')
    .eq('model_id', modelId)
    .order('display_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map(toCamelCase);
}

export async function createSubreddit(modelId: string, name: string, notes?: string) {
  const supabase = getSupabaseClient();

  // Get current max display_order
  const { data: existing } = await supabase
    .from('subreddits')
    .select('display_order')
    .eq('model_id', modelId)
    .order('display_order', { ascending: false })
    .limit(1);

  const displayOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

  const { data, error } = await supabase
    .from('subreddits')
    .insert({
      model_id: modelId,
      name,
      notes: notes || null,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

export async function updateSubreddit(id: string, updates: Record<string, any>) {
  const supabase = getSupabaseClient();
  const snakeCaseUpdates = toSnakeCase(updates);

  const { data, error } = await supabase
    .from('subreddits')
    .update(snakeCaseUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

export async function deleteSubreddit(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('subreddits')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

// ============ SCHEDULED POSTS ============

export async function listScheduledPosts(modelId: string, profileId: string, startDate: string, endDate: string) {
  const supabase = getSupabaseClient();

  // First get all subreddit IDs for this model
  const { data: subreddits, error: subError } = await supabase
    .from('subreddits')
    .select('id')
    .eq('model_id', modelId);

  if (subError) throw new Error(subError.message);
  if (!subreddits || subreddits.length === 0) return [];

  const subredditIds = subreddits.map(s => s.id);

  // Then get all posts for those subreddits and profile in the date range
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .in('subreddit_id', subredditIds)
    .eq('profile_id', profileId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate);

  if (error) throw new Error(error.message);
  return (data || []).map(toCamelCase);
}

export async function createScheduledPost(
  subredditId: string,
  profileId: string,
  scheduledDate: string,
  contentLink?: string,
  caption?: string
) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert({
      subreddit_id: subredditId,
      profile_id: profileId,
      scheduled_date: scheduledDate,
      content_link: contentLink || null,
      caption: caption || null,
      is_posted: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

export async function updateScheduledPost(id: string, updates: Record<string, any>) {
  const supabase = getSupabaseClient();
  const snakeCaseUpdates = toSnakeCase(updates);

  const { data, error } = await supabase
    .from('scheduled_posts')
    .update(snakeCaseUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

export async function deleteScheduledPost(id: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('scheduled_posts')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

// ============ REDDIT POSTS (ACTUAL) ============

// Helper to fetch JSON from Reddit
function fetchRedditJson(url: string): Promise<any> {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 15000,
    }, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

// Fetch and store Reddit posts for a profile
export async function syncRedditPosts(profileId: string, username: string) {
  const supabase = getSupabaseClient();

  // Clean username
  const cleanUsername = username.replace(/^u\//, '').trim();
  if (!cleanUsername) return { synced: 0, error: 'Invalid username' };

  // Get profile status to store with posts
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', profileId)
    .single();
  const isBanned = profile?.status === 'banned';

  console.log('Fetching Reddit posts for:', cleanUsername);

  // Fetch posts from Reddit (up to 100)
  const postsData = await fetchRedditJson(
    `https://www.reddit.com/user/${cleanUsername}/submitted.json?limit=100&sort=new`
  );

  if (!postsData?.data?.children) {
    return { synced: 0, error: 'Could not fetch posts' };
  }

  const posts = postsData.data.children;
  let synced = 0;

  for (const post of posts) {
    const p = post.data;

    // Get best image URL - try multiple sources
    let previewUrl: string | null = null;

    // 1. Check if URL is a direct image from i.redd.it or imgur
    if (p.url && (p.url.includes('i.redd.it') || p.url.includes('i.imgur.com'))) {
      previewUrl = p.url;
    }
    // 2. Try preview images
    else if (p.preview?.images?.[0]?.source?.url) {
      previewUrl = p.preview.images[0].source.url.replace(/&amp;/g, '&');
    }
    // 3. Try url_overridden_by_dest for crossposted content
    else if (p.url_overridden_by_dest && (p.url_overridden_by_dest.includes('i.redd.it') || p.url_overridden_by_dest.includes('i.imgur.com'))) {
      previewUrl = p.url_overridden_by_dest;
    }

    // Upsert post
    const { error } = await supabase
      .from('reddit_posts')
      .upsert({
        profile_id: profileId,
        reddit_id: p.id,
        subreddit: p.subreddit,
        title: p.title,
        url: p.url || null,
        permalink: p.permalink,
        thumbnail: p.thumbnail && p.thumbnail.startsWith('http') ? p.thumbnail : null,
        preview_url: previewUrl,
        selftext: p.selftext || null,
        score: p.score || 0,
        upvote_ratio: p.upvote_ratio || null,
        num_comments: p.num_comments || 0,
        created_utc: new Date(p.created_utc * 1000).toISOString(),
        fetched_at: new Date().toISOString(),
        account_name: cleanUsername,
        is_banned: isBanned,
      }, {
        onConflict: 'profile_id,reddit_id',
      });

    if (!error) synced++;
  }

  console.log(`Synced ${synced} posts for ${cleanUsername}`);
  return { synced, total: posts.length };
}

// Get Reddit posts for a model (all profiles in that model), or all posts if no model specified
export async function listRedditPosts(modelId?: string, startDate?: string, endDate?: string) {
  const supabase = getSupabaseClient();

  // Get profile IDs - filter by model if specified, otherwise get all
  let profileQuery = supabase
    .from('profiles')
    .select('id')
    .is('deleted_at', null);

  if (modelId) {
    profileQuery = profileQuery.eq('model_id', modelId);
  }

  const { data: profiles, error: profError } = await profileQuery;

  if (profError) throw new Error(profError.message);
  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map(p => p.id);

  // Build query
  let query = supabase
    .from('reddit_posts')
    .select('*')
    .in('profile_id', profileIds)
    .order('created_utc', { ascending: false });

  if (startDate) {
    query = query.gte('created_utc', startDate);
  }
  if (endDate) {
    query = query.lte('created_utc', endDate);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data || []).map(toCamelCase);
}

// Get a single Reddit post by ID
export async function getRedditPost(id: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('reddit_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

// Update a Reddit post (e.g., to add drive_link)
export async function updateRedditPost(id: string, updates: Record<string, any>) {
  const supabase = getSupabaseClient();
  const snakeCaseUpdates = toSnakeCase(updates);

  const { data, error } = await supabase
    .from('reddit_posts')
    .update(snakeCaseUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}

// ============ SUBREDDIT STATS (for Admin page) ============

interface SubredditStats {
  subreddit: string;
  postCount: number;
  hasGoogleDrive: boolean;
  driveLinks: string[];
  users: { id: string; username: string }[];
  profiles: { id: string; name: string; status: string }[];
}

// Get aggregated subreddit stats from reddit_posts
export async function getSubredditStats(): Promise<SubredditStats[]> {
  const supabase = getSupabaseClient();

  // Get all reddit posts with their profile info
  const { data: posts, error: postsError } = await supabase
    .from('reddit_posts')
    .select('subreddit, profile_id, drive_link');

  if (postsError) throw new Error(postsError.message);
  if (!posts || posts.length === 0) return [];

  // Get all profiles with their user assignments
  const profileIds = [...new Set(posts.map(p => p.profile_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, status, user_id')
    .in('id', profileIds);

  if (profilesError) throw new Error(profilesError.message);

  // Get all users
  const userIds = [...new Set((profiles || []).map(p => p.user_id).filter(Boolean))];
  let usersMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('id, username')
      .in('id', userIds);
    if (!usersError && users) {
      usersMap = Object.fromEntries(users.map(u => [u.id, u.username]));
    }
  }

  // Create profile map
  const profileMap: Record<string, { name: string; status: string; userId: string | null }> = {};
  (profiles || []).forEach(p => {
    profileMap[p.id] = { name: p.name, status: p.status || 'unknown', userId: p.user_id };
  });

  // Aggregate by subreddit
  const subredditMap: Record<string, {
    postCount: number;
    hasGoogleDrive: boolean;
    driveLinks: Set<string>;
    profileIds: Set<string>;
    userIds: Set<string>;
  }> = {};

  posts.forEach(post => {
    const sub = post.subreddit;
    if (!subredditMap[sub]) {
      subredditMap[sub] = {
        postCount: 0,
        hasGoogleDrive: false,
        driveLinks: new Set(),
        profileIds: new Set(),
        userIds: new Set(),
      };
    }
    subredditMap[sub].postCount++;
    if (post.drive_link) {
      subredditMap[sub].hasGoogleDrive = true;
      subredditMap[sub].driveLinks.add(post.drive_link);
    }
    subredditMap[sub].profileIds.add(post.profile_id);
    const profile = profileMap[post.profile_id];
    if (profile?.userId) {
      subredditMap[sub].userIds.add(profile.userId);
    }
  });

  // Convert to array format
  const result: SubredditStats[] = Object.entries(subredditMap).map(([subreddit, data]) => ({
    subreddit,
    postCount: data.postCount,
    hasGoogleDrive: data.hasGoogleDrive,
    driveLinks: [...data.driveLinks],
    users: [...data.userIds].map(id => ({ id, username: usersMap[id] || 'Unknown' })),
    profiles: [...data.profileIds].map(id => {
      const p = profileMap[id];
      return { id, name: p?.name || 'Unknown', status: p?.status || 'unknown' };
    }),
  }));

  // Sort by post count descending
  result.sort((a, b) => b.postCount - a.postCount);

  return result;
}

// Create a manual subreddit usage entry
export async function createSubredditUsage(subreddit: string, userId?: string, profileId?: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('subreddit_usage')
    .insert({
      subreddit,
      user_id: userId || null,
      profile_id: profileId || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toCamelCase(data);
}
