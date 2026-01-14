import { getSupabaseClient } from './client';

export interface MainEmail {
  id: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface SubEmail {
  id: string;
  mainEmailId: string;
  email: string;
  createdAt: string;
}

// Main Emails CRUD
export async function listMainEmails(): Promise<MainEmail[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('main_emails')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((e: any) => ({
    id: e.id,
    email: e.email,
    password: e.password,
    createdAt: e.created_at,
  }));
}

export async function createMainEmail(email: string, password: string): Promise<MainEmail> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('main_emails')
    .insert({ email: email.toLowerCase().trim(), password })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Email already exists');
    }
    throw new Error(error.message);
  }
  return {
    id: data.id,
    email: data.email,
    password: data.password,
    createdAt: data.created_at,
  };
}

export async function updateMainEmail(
  id: string,
  updates: { email?: string; password?: string }
): Promise<MainEmail> {
  const supabase = getSupabaseClient();
  const dbUpdates: any = {};
  if (updates.email) dbUpdates.email = updates.email.toLowerCase().trim();
  if (updates.password) dbUpdates.password = updates.password;

  const { data, error } = await supabase
    .from('main_emails')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    id: data.id,
    email: data.email,
    password: data.password,
    createdAt: data.created_at,
  };
}

export async function deleteMainEmail(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  // Delete all sub-emails first
  await supabase.from('sub_emails').delete().eq('main_email_id', id);

  const { error } = await supabase
    .from('main_emails')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

// Sub Emails CRUD
export async function listSubEmails(mainEmailId?: string): Promise<SubEmail[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('sub_emails')
    .select('*')
    .order('created_at', { ascending: true });

  if (mainEmailId) {
    query = query.eq('main_email_id', mainEmailId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data || []).map((e: any) => ({
    id: e.id,
    mainEmailId: e.main_email_id,
    email: e.email,
    createdAt: e.created_at,
  }));
}

export async function createSubEmail(mainEmailId: string, email: string): Promise<SubEmail> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sub_emails')
    .insert({ main_email_id: mainEmailId, email: email.toLowerCase().trim() })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Sub-email already exists');
    }
    throw new Error(error.message);
  }
  return {
    id: data.id,
    mainEmailId: data.main_email_id,
    email: data.email,
    createdAt: data.created_at,
  };
}

export async function updateSubEmail(id: string, email: string): Promise<SubEmail> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sub_emails')
    .update({ email: email.toLowerCase().trim() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    id: data.id,
    mainEmailId: data.main_email_id,
    email: data.email,
    createdAt: data.created_at,
  };
}

export async function deleteSubEmail(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('sub_emails')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

// Get all emails structured for dropdown selection
export async function getEmailsForSelection(): Promise<{ mainEmails: MainEmail[]; subEmails: SubEmail[] }> {
  const [mainEmails, subEmails] = await Promise.all([
    listMainEmails(),
    listSubEmails(),
  ]);
  return { mainEmails, subEmails };
}
