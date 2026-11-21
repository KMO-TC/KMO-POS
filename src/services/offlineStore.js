import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

const isWebPlatform = Platform.OS === 'web';
let databasePromise;
let initializationPromise;
let syncInProgress = false;

const createId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const createServiceVoucherNo = () => (
  `SRV-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
);

async function getDatabase() {
  if (isWebPlatform) {
    throw new Error('SQLite is only available in the Android/iOS app.');
  }
  if (!databasePromise) {
    databasePromise = import('expo-sqlite').then((SQLite) => SQLite.openDatabaseAsync('kmo-pos.db'));
  }
  const database = await databasePromise;
  if (!initializationPromise) {
    initializationPromise = database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS products_cache (
        id TEXT PRIMARY KEY NOT NULL,
        shop_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        sync_state TEXT NOT NULL DEFAULT 'synced'
      );
      CREATE TABLE IF NOT EXISTS services_cache (
        id TEXT PRIMARY KEY NOT NULL,
        shop_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        sync_state TEXT NOT NULL DEFAULT 'synced'
      );
      CREATE TABLE IF NOT EXISTS users_cache (
        user_id TEXT PRIMARY KEY NOT NULL,
        data_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS shops_cache (
        shop_id TEXT PRIMARY KEY NOT NULL,
        data_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sales_cache (
        id TEXT PRIMARY KEY NOT NULL,
        voucher_no TEXT NOT NULL,
        shop_id TEXT NOT NULL,
        data_json TEXT NOT NULL,
        sync_state TEXT NOT NULL DEFAULT 'pending',
        UNIQUE (shop_id, voucher_no)
      );
      CREATE TABLE IF NOT EXISTS pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS id_mappings (
        local_id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT NOT NULL
      );
    `);
  }
  await initializationPromise;
  return database;
}

export async function initializeOfflineStore() {
  if (isWebPlatform) return;
  await getDatabase();
}

export function isNetworkError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return offline || /network|fetch failed|failed to fetch|connection|internet|offline|timed out|timeout/.test(message);
}

function parseJson(value) {
  return JSON.parse(value);
}

async function enqueue(database, operation, entityId, payload) {
  await database.runAsync(
    'INSERT INTO pending_sync (operation, entity_id, payload_json) VALUES (?, ?, ?)',
    operation,
    String(entityId),
    JSON.stringify(payload)
  );
}

async function getRemoteId(database, id) {
  const mapping = await database.getFirstAsync(
    'SELECT remote_id FROM id_mappings WHERE local_id = ?',
    String(id)
  );
  return mapping?.remote_id || id;
}

async function saveProductCache(database, product, syncState) {
  await database.runAsync(
    `INSERT INTO products_cache (id, shop_id, data_json, sync_state)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       shop_id = excluded.shop_id,
       data_json = excluded.data_json,
       sync_state = excluded.sync_state`,
    String(product.id),
    String(product.shop_id),
    JSON.stringify(product),
    syncState
  );
}

async function saveServiceCache(database, service, syncState) {
  await database.runAsync(
    `INSERT INTO services_cache (id, shop_id, data_json, sync_state)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       shop_id = excluded.shop_id,
       data_json = excluded.data_json,
       sync_state = excluded.sync_state`,
    String(service.id),
    String(service.shop_id),
    JSON.stringify(service),
    syncState
  );
}

export async function saveUserProfile(userId, profile) {
  if (isWebPlatform) return;
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO users_cache (user_id, data_json) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json`,
    String(userId),
    JSON.stringify(profile)
  );
}

export async function getCachedUserProfile(userId) {
  if (isWebPlatform) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT data_json FROM users_cache WHERE user_id = ?',
    String(userId)
  );
  return row ? parseJson(row.data_json) : null;
}

export async function saveShop(shopId, shop) {
  if (isWebPlatform) return;
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO shops_cache (shop_id, data_json) VALUES (?, ?)
     ON CONFLICT(shop_id) DO UPDATE SET data_json = excluded.data_json`,
    String(shopId),
    JSON.stringify(shop)
  );
}

export async function getCachedShop(shopId) {
  if (isWebPlatform) {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT data_json FROM shops_cache WHERE shop_id = ?',
    String(shopId)
  );
  return row ? parseJson(row.data_json) : null;
}

export async function getCachedProducts(shopId) {
  if (isWebPlatform) return loadProducts(shopId);
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    'SELECT data_json FROM products_cache WHERE shop_id = ? ORDER BY rowid DESC',
    String(shopId)
  );
  return rows.map((row) => parseJson(row.data_json));
}

export async function getCachedServices(shopId) {
  if (isWebPlatform) return loadServices(shopId);
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    'SELECT data_json FROM services_cache WHERE shop_id = ? ORDER BY rowid DESC',
    String(shopId)
  );
  return rows.map((row) => parseJson(row.data_json));
}

export async function loadProducts(shopId) {
  if (isWebPlatform) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  const database = await getDatabase();
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    await database.runAsync(
      "DELETE FROM products_cache WHERE shop_id = ? AND sync_state = 'synced'",
      String(shopId)
    );
    for (const product of data || []) {
      const mapping = await database.getFirstAsync(
        'SELECT local_id FROM id_mappings WHERE remote_id = ?',
        String(product.id)
      );
      const cacheId = mapping?.local_id || String(product.id);
      const cachedProduct = { ...product, id: cacheId };
      await database.runAsync(
        `INSERT INTO products_cache (id, shop_id, data_json, sync_state)
         VALUES (?, ?, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET
           shop_id = excluded.shop_id,
           data_json = excluded.data_json,
           sync_state = 'synced'
         WHERE products_cache.sync_state = 'synced'`,
        cacheId,
        String(product.shop_id),
        JSON.stringify(cachedProduct)
      );
    }
    return getCachedProducts(shopId);
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return getCachedProducts(shopId);
  }
}

export async function loadServices(shopId) {
  if (isWebPlatform) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  const database = await getDatabase();
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    await database.runAsync(
      "DELETE FROM services_cache WHERE shop_id = ? AND sync_state = 'synced'",
      String(shopId)
    );
    for (const service of data || []) {
      const mapping = await database.getFirstAsync(
        'SELECT local_id FROM id_mappings WHERE remote_id = ?',
        String(service.id)
      );
      const cacheId = mapping?.local_id || String(service.id);
      const pendingDelete = await database.getFirstAsync(
        `SELECT id FROM pending_sync
         WHERE operation = 'service_delete' AND entity_id = ?
         LIMIT 1`,
        cacheId
      );
      if (pendingDelete) continue;
      const cachedService = { ...service, id: cacheId };
      await database.runAsync(
        `INSERT INTO services_cache (id, shop_id, data_json, sync_state)
         VALUES (?, ?, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET
           shop_id = excluded.shop_id,
           data_json = excluded.data_json,
           sync_state = 'synced'
         WHERE services_cache.sync_state = 'synced'`,
        cacheId,
        String(service.shop_id),
        JSON.stringify(cachedService)
      );
    }
    return getCachedServices(shopId);
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return getCachedServices(shopId);
  }
}

export async function saveProduct(product, productId = null) {
  if (isWebPlatform) {
    if (productId === null) {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', productId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const database = await getDatabase();
  const id = productId === null ? createId() : String(productId);
  const isNew = productId === null;
  const remoteId = await getRemoteId(database, id);

  if (!isNew && id.startsWith('local-') && remoteId === id) {
    return saveProductOffline(database, { ...product, id }, id, false);
  }

  try {
    await syncPendingChanges();
    if (isNew) {
      const { data, error } = await supabase.from('products').insert([product]).select().single();
      if (error) throw error;
      await saveProductCache(database, data, 'synced');
      return data;
    }
    const { error } = await supabase.from('products').update(product).eq('id', remoteId);
    if (error) throw error;
    const cachedRow = await database.getFirstAsync(
      'SELECT data_json FROM products_cache WHERE id = ?',
      id
    );
    const updatedProduct = {
      ...(cachedRow ? parseJson(cachedRow.data_json) : {}),
      ...product,
      id,
    };
    await saveProductCache(database, updatedProduct, 'synced');
    return updatedProduct;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    const localProduct = { ...product, id };
    return saveProductOffline(database, localProduct, id, isNew);
  }
}

async function saveProductOffline(database, product, id, isNew) {
  if (isNew) {
    await saveProductCache(database, product, 'pending');
    await enqueue(database, 'product_insert', id, product);
    return product;
  }

  const pendingInsert = await database.getFirstAsync(
    `SELECT id, payload_json FROM pending_sync
     WHERE operation = 'product_insert' AND entity_id = ?
     ORDER BY id LIMIT 1`,
    String(id)
  );
  if (pendingInsert) {
    const mergedProduct = { ...parseJson(pendingInsert.payload_json), ...product, id };
    await database.runAsync(
      'UPDATE pending_sync SET payload_json = ? WHERE id = ?',
      JSON.stringify(mergedProduct),
      pendingInsert.id
    );
    await saveProductCache(database, mergedProduct, 'pending');
    return mergedProduct;
  }

  await saveProductCache(database, product, 'pending');
  await enqueue(database, 'product_update', id, product);
  return product;
}

export async function saveService(service, serviceId = null) {
  if (isWebPlatform) {
    const serviceData = {
      ...service,
      ...(serviceId === null && !service.voucher_no
        ? { voucher_no: createServiceVoucherNo() }
        : {}),
      ...(serviceId === null && !service.created_at
        ? { created_at: new Date().toISOString() }
        : {}),
    };
    if (serviceId === null) {
      const { data, error } = await supabase
        .from('services')
        .insert([serviceData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase
      .from('services')
      .update(serviceData)
      .eq('id', serviceId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const database = await getDatabase();
  const id = serviceId === null ? createId() : String(serviceId);
  const isNew = serviceId === null;
  const serviceData = {
    ...service,
    ...(isNew && !service.voucher_no ? { voucher_no: createServiceVoucherNo() } : {}),
    ...(isNew && !service.created_at ? { created_at: new Date().toISOString() } : {}),
  };
  const remoteId = await getRemoteId(database, id);

  if (!isNew && id.startsWith('local-') && remoteId === id) {
    return saveServiceOffline(database, { ...serviceData, id }, id, false);
  }

  try {
    await syncPendingChanges();
    if (isNew) {
      const { data, error } = await supabase.from('services').insert([serviceData]).select().single();
      if (error) throw error;
      await saveServiceCache(database, data, 'synced');
      return data;
    }

    const { error } = await supabase.from('services').update(serviceData).eq('id', remoteId);
    if (error) throw error;
    const cachedRow = await database.getFirstAsync(
      'SELECT data_json FROM services_cache WHERE id = ?',
      id
    );
    const updatedService = {
      ...(cachedRow ? parseJson(cachedRow.data_json) : {}),
      ...serviceData,
      id,
    };
    await saveServiceCache(database, updatedService, 'synced');
    return updatedService;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return saveServiceOffline(database, { ...serviceData, id }, id, isNew);
  }
}

async function saveServiceOffline(database, service, id, isNew) {
  if (isNew) {
    await saveServiceCache(database, service, 'pending');
    await enqueue(database, 'service_insert', id, service);
    return service;
  }

  const pendingInsert = await database.getFirstAsync(
    `SELECT id, payload_json FROM pending_sync
     WHERE operation = 'service_insert' AND entity_id = ?
     ORDER BY id LIMIT 1`,
    String(id)
  );
  if (pendingInsert) {
    const mergedService = { ...parseJson(pendingInsert.payload_json), ...service, id };
    await database.runAsync(
      'UPDATE pending_sync SET payload_json = ? WHERE id = ?',
      JSON.stringify(mergedService),
      pendingInsert.id
    );
    await saveServiceCache(database, mergedService, 'pending');
    return mergedService;
  }

  const cachedRow = await database.getFirstAsync(
    'SELECT data_json FROM services_cache WHERE id = ?',
    String(id)
  );
  const cachedService = cachedRow ? parseJson(cachedRow.data_json) : {};
  const pendingUpdate = await database.getFirstAsync(
    `SELECT id, payload_json FROM pending_sync
     WHERE operation = 'service_update' AND entity_id = ?
     ORDER BY id DESC LIMIT 1`,
    String(id)
  );
  const updatedService = pendingUpdate
    ? { ...cachedService, ...parseJson(pendingUpdate.payload_json), ...service, id }
    : { ...cachedService, ...service, id };
  if (pendingUpdate) {
    await database.runAsync(
      'UPDATE pending_sync SET payload_json = ? WHERE id = ?',
      JSON.stringify(updatedService),
      pendingUpdate.id
    );
  } else {
    await enqueue(database, 'service_update', id, updatedService);
  }
  await saveServiceCache(database, updatedService, 'pending');
  return updatedService;
}

export async function deleteProduct(productId) {
  if (isWebPlatform) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    if (error) throw error;
    return;
  }
  const database = await getDatabase();
  const id = String(productId);
  const remoteId = await getRemoteId(database, id);

  if (id.startsWith('local-') && remoteId === id) {
    await enqueue(database, 'product_delete', id, {});
    await database.runAsync('DELETE FROM products_cache WHERE id = ?', id);
    return;
  }

  try {
    await syncPendingChanges();
    const { error } = await supabase.from('products').delete().eq('id', remoteId);
    if (error) throw error;
    await database.runAsync('DELETE FROM products_cache WHERE id = ?', id);
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    await enqueue(database, 'product_delete', id, {});
    await database.runAsync('DELETE FROM products_cache WHERE id = ?', id);
  }
}

export async function deleteService(serviceId) {
  if (isWebPlatform) {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);
    if (error) throw error;
    return;
  }
  const database = await getDatabase();
  const id = String(serviceId);
  const remoteId = await getRemoteId(database, id);

  if (id.startsWith('local-') && remoteId === id) {
    const pendingInsert = await database.getFirstAsync(
      `SELECT id FROM pending_sync
       WHERE operation = 'service_insert' AND entity_id = ?
       ORDER BY id LIMIT 1`,
      id
    );
    if (pendingInsert) {
      await database.runAsync('DELETE FROM pending_sync WHERE entity_id = ?', id);
      await database.runAsync('DELETE FROM services_cache WHERE id = ?', id);
      return;
    }
  }

  try {
    await syncPendingChanges();
    const { error } = await supabase.from('services').delete().eq('id', remoteId);
    if (error) throw error;
    await database.runAsync('DELETE FROM services_cache WHERE id = ?', id);
    await database.runAsync('DELETE FROM id_mappings WHERE local_id = ?', id);
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    await enqueue(database, 'service_delete', id, {});
    await database.runAsync('DELETE FROM services_cache WHERE id = ?', id);
  }
}

async function commitOfflineSale(database, sale) {
  const existing = await database.getFirstAsync(
    'SELECT data_json FROM sales_cache WHERE shop_id = ? AND voucher_no = ?',
    String(sale.shop_id),
    sale.voucher_no
  );
  if (existing) return parseJson(existing.data_json);

  const localSale = { ...sale, id: createId() };
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      'INSERT INTO sales_cache (id, voucher_no, shop_id, data_json, sync_state) VALUES (?, ?, ?, ?, ?)',
      localSale.id,
      localSale.voucher_no,
      String(localSale.shop_id),
      JSON.stringify(localSale),
      'pending'
    );
    await database.runAsync(
      'INSERT INTO pending_sync (operation, entity_id, payload_json) VALUES (?, ?, ?)',
      'sale_insert',
      localSale.id,
      JSON.stringify(sale)
    );

    for (const item of sale.items || []) {
      const currentStock = Number(item.stock) || 0;
      const soldQuantity = Number(item.quantity) || 0;
      const nextStock = Math.max(0, currentStock - soldQuantity);
      const id = String(item.id);
      const row = await database.getFirstAsync(
        'SELECT data_json FROM products_cache WHERE id = ?',
        id
      );
      const product = row ? parseJson(row.data_json) : { ...item };
      await database.runAsync(
        `INSERT INTO products_cache (id, shop_id, data_json, sync_state)
         VALUES (?, ?, ?, 'pending')
         ON CONFLICT(id) DO UPDATE SET
           data_json = excluded.data_json,
           sync_state = 'pending'`,
        id,
        String(sale.shop_id),
        JSON.stringify({ ...product, stock: nextStock })
      );
      await database.runAsync(
        'INSERT INTO pending_sync (operation, entity_id, payload_json) VALUES (?, ?, ?)',
        'product_decrement',
        id,
        JSON.stringify({ quantity: soldQuantity })
      );
    }
  });
  return localSale;
}

async function decrementRemoteStock(database, productId, quantity) {
  const remoteId = await getRemoteId(database, productId);
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('stock')
    .eq('id', remoteId)
    .single();
  if (fetchError) throw fetchError;

  const nextStock = Math.max(0, (Number(product.stock) || 0) - quantity);
  const { error: updateError } = await supabase
    .from('products')
    .update({ stock: nextStock })
    .eq('id', remoteId);
  if (updateError) throw updateError;
  return nextStock;
}

export async function saveSale(sale) {
  if (isWebPlatform) {
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
  const database = await getDatabase();
  try {
    await syncPendingChanges();
    const { data: existingSale, error: lookupError } = await supabase
      .from('sales')
      .select('*')
      .eq('voucher_no', sale.voucher_no)
      .eq('shop_id', sale.shop_id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (existingSale) return existingSale;

    const { data, error } = await supabase.from('sales').insert([sale]).select().single();
    if (error) throw error;
    for (const item of sale.items || []) {
      const quantity = Number(item.quantity) || 0;
      const nextStock = await decrementRemoteStock(database, item.id, quantity);

      const row = await database.getFirstAsync(
        'SELECT data_json FROM products_cache WHERE id = ?',
        String(item.id)
      );
      if (row) {
        await saveProductCache(database, { ...parseJson(row.data_json), stock: nextStock }, 'synced');
      }
    }
    await database.runAsync(
      'INSERT OR REPLACE INTO sales_cache (id, voucher_no, shop_id, data_json, sync_state) VALUES (?, ?, ?, ?, ?)',
      String(data.id),
      data.voucher_no,
      String(data.shop_id),
      JSON.stringify(data),
      'synced'
    );
    return data;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return commitOfflineSale(database, sale);
  }
}

async function syncOperation(database, row) {
  const payload = parseJson(row.payload_json);
  const id = row.entity_id;

  if (row.operation === 'product_insert') {
    const { id: _localId, ...product } = payload;
    const { data, error } = await supabase.from('products').insert([product]).select('id').single();
    if (error) throw error;
    await database.runAsync(
      'INSERT OR REPLACE INTO id_mappings (local_id, remote_id) VALUES (?, ?)',
      id,
      String(data.id)
    );
  } else if (row.operation === 'product_update') {
    const { id: _localId, ...product } = payload;
    const { error } = await supabase
      .from('products')
      .update(product)
      .eq('id', await getRemoteId(database, id));
    if (error) throw error;
  } else if (row.operation === 'product_decrement') {
    const nextStock = await decrementRemoteStock(database, id, Number(payload.quantity) || 0);
    const cachedRow = await database.getFirstAsync(
      'SELECT data_json FROM products_cache WHERE id = ?',
      id
    );
    if (cachedRow) {
      await saveProductCache(
        database,
        { ...parseJson(cachedRow.data_json), stock: nextStock },
        'pending'
      );
    }
  } else if (row.operation === 'product_delete') {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', await getRemoteId(database, id));
    if (error) throw error;
  } else if (row.operation === 'sale_insert') {
    const { data: existing, error: lookupError } = await supabase
      .from('sales')
      .select('id')
      .eq('voucher_no', payload.voucher_no)
      .eq('shop_id', payload.shop_id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) {
      const items = await Promise.all((payload.items || []).map(async (item) => ({
        ...item,
        id: await getRemoteId(database, item.id),
      })));
      const { error } = await supabase.from('sales').insert([{ ...payload, items }]);
      if (error) throw error;
    }
  } else if (row.operation === 'service_insert') {
    const { id: _localId, ...service } = payload;
    if (!service.voucher_no) {
      service.voucher_no = createServiceVoucherNo();
      await database.runAsync(
        'UPDATE pending_sync SET payload_json = ? WHERE id = ?',
        JSON.stringify({ ...service, id: _localId }),
        row.id
      );
    }
    let remoteId;
    if (service.voucher_no) {
      const { data: existing, error: lookupError } = await supabase
        .from('services')
        .select('id')
        .eq('shop_id', service.shop_id)
        .eq('voucher_no', service.voucher_no)
        .maybeSingle();
      if (lookupError) throw lookupError;
      remoteId = existing?.id;
    }
    if (!remoteId) {
      const { data, error } = await supabase.from('services').insert([service]).select('id').single();
      if (error) throw error;
      remoteId = data.id;
    }
    await database.runAsync(
      'INSERT OR REPLACE INTO id_mappings (local_id, remote_id) VALUES (?, ?)',
      id,
      String(remoteId)
    );
  } else if (row.operation === 'service_update') {
    const { id: _localId, ...service } = payload;
    const { error } = await supabase
      .from('services')
      .update(service)
      .eq('id', await getRemoteId(database, id));
    if (error) throw error;
  } else if (row.operation === 'service_delete') {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', await getRemoteId(database, id));
    if (error) throw error;
    await database.runAsync('DELETE FROM id_mappings WHERE local_id = ?', id);
  } else {
    throw new Error(`Unknown offline sync operation: ${row.operation}`);
  }
}

export async function syncPendingChanges() {
  if (isWebPlatform) return;
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    const database = await getDatabase();
    const pending = await database.getAllAsync('SELECT * FROM pending_sync ORDER BY id');
    for (const row of pending) {
      await syncOperation(database, row);
      await database.runAsync('DELETE FROM pending_sync WHERE id = ?', row.id);
      if (row.operation.startsWith('product_')) {
        const remaining = await database.getFirstAsync(
          'SELECT id FROM pending_sync WHERE entity_id = ? LIMIT 1',
          row.entity_id
        );
        if (!remaining && row.operation !== 'product_delete') {
          await database.runAsync(
            "UPDATE products_cache SET sync_state = 'synced' WHERE id = ?",
            row.entity_id
          );
        }
      } else if (row.operation.startsWith('service_')) {
        const remaining = await database.getFirstAsync(
          'SELECT id FROM pending_sync WHERE entity_id = ? LIMIT 1',
          row.entity_id
        );
        if (!remaining && row.operation !== 'service_delete') {
          await database.runAsync(
            "UPDATE services_cache SET sync_state = 'synced' WHERE id = ?",
            row.entity_id
          );
        }
      } else if (row.operation === 'sale_insert') {
        await database.runAsync(
          "UPDATE sales_cache SET sync_state = 'synced' WHERE id = ?",
          row.entity_id
        );
      }
    }
  } finally {
    syncInProgress = false;
  }
}

export async function getPendingSyncCount() {
  if (isWebPlatform) return 0;
  const database = await getDatabase();
  const result = await database.getFirstAsync('SELECT COUNT(*) AS count FROM pending_sync');
  return Number(result?.count) || 0;
}
