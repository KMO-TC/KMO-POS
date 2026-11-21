import { supabase } from '../config/supabase';

export async function initializeOfflineStore() {}

export function isNetworkError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return offline || /network|fetch failed|failed to fetch|connection|internet|offline|timed out|timeout/.test(message);
}

export async function saveUserProfile() {}
export async function saveShop() {}
export async function getCachedProducts(shopId) {
  return loadProducts(shopId);
}
export async function getCachedServices(shopId) {
  return loadServices(shopId);
}

export async function getCachedUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCachedShop(shopId) {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadProducts(shopId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function loadServices(shopId) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveProduct(product, productId = null) {
  const query = productId === null
    ? supabase.from('products').insert([product])
    : supabase.from('products').update(product).eq('id', productId);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function saveService(service, serviceId = null) {
  const serviceData = {
    ...service,
    ...(serviceId === null && !service.voucher_no
      ? { voucher_no: `SRV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}` }
      : {}),
    ...(serviceId === null && !service.created_at
      ? { created_at: new Date().toISOString() }
      : {}),
  };
  const query = serviceId === null
    ? supabase.from('services').insert([serviceData])
    : supabase.from('services').update(serviceData).eq('id', serviceId);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(productId) {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw error;
}

export async function deleteService(serviceId) {
  const { error } = await supabase.from('services').delete().eq('id', serviceId);
  if (error) throw error;
}

export async function saveSale(sale) {
  const { data: existingSale, error: lookupError } = await supabase
    .from('sales')
    .select('*')
    .eq('voucher_no', sale.voucher_no)
    .eq('shop_id', sale.shop_id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existingSale) return existingSale;

  const { data, error } = await supabase
    .from('sales')
    .insert([sale])
    .select()
    .single();
  if (error) throw error;

  for (const item of sale.items || []) {
    const quantity = Number(item.quantity) || 0;
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.id)
      .single();
    if (productError) throw productError;
    const nextStock = Math.max(0, (Number(product.stock) || 0) - quantity);
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: nextStock })
      .eq('id', item.id);
    if (stockError) throw stockError;
  }
  return data;
}

export async function syncPendingChanges() {}
export async function getPendingSyncCount() {
  return 0;
}
