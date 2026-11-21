// src/screens/ReceiptPrintScreen.js
import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { ResponsiveText as Text } from '../components/ResponsiveText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { escapeHtml, printHtmlDocument } from '../services/printService';
import { Alert } from '../components/LocalizedAlert';

const formatReceiptDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

export default function ReceiptPrintScreen({ route, navigation }) {
  const { isService, serviceData, saleData, customerName, customerPhone, finalTotal, discount } = route.params || {};

  const activeSource = isService ? serviceData : saleData;
  const shopName = activeSource?.shopName || ' POS ဆိုင်';
  const shopAddress = activeSource?.shopAddress || 'nearby';
  const shopPhone = activeSource?.shopPhone || '09-XXXXXXXXX';

  let items = saleData?.items || [];
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (e) { items = []; }
  }

  const handlePrintReceipt = async () => {
    try {
      if (Platform.OS === 'web') {
        const total = Number(finalTotal ?? saleData?.total_amount) || 0;
        const discountAmount = Number(discount) || 0;
        const content = isService
          ? `
            <p><strong>Voucher:</strong> ${escapeHtml(serviceData?.voucher_no || 'SRV-ONLINE')}</p>
            <p><strong>Date:</strong> ${escapeHtml(formatReceiptDate(serviceData?.created_at))}</p>
            <p><strong>Customer:</strong> ${escapeHtml(serviceData?.customer_name || '-')}</p>
            <p><strong>Phone:</strong> ${escapeHtml(serviceData?.phone || '-')}</p>
            <p><strong>Device:</strong> ${escapeHtml(serviceData?.device_model || '-')}</p>
            <p><strong>Issue:</strong> ${escapeHtml(serviceData?.fault_description || '-')}</p>
            <hr />
            <p class="total"><span>Service fee</span><strong>${(Number(serviceData?.service_fee) || 0).toLocaleString()} ကျပ်</strong></p>
          `
          : `
            <p><strong>Voucher:</strong> ${escapeHtml(saleData?.voucher_no || 'V-ONLINE')}</p>
            <p><strong>Date:</strong> ${escapeHtml(formatReceiptDate(saleData?.created_at))}</p>
            <p><strong>Payment:</strong> ${escapeHtml(saleData?.payment_method || 'Cash')}</p>
            <p><strong>Customer:</strong> ${escapeHtml(customerName || '-')} (${escapeHtml(customerPhone || '-')})</p>
            <table>
              <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>${(Array.isArray(items) ? items : []).map((item) => {
                const quantity = Number(item.quantity || item.qty) || 1;
                const price = Number(item.selling_price || item.price) || 0;
                return `<tr><td>${escapeHtml(item.name || 'Item')}</td><td>${quantity}</td><td>${(price * quantity).toLocaleString()}</td></tr>`;
              }).join('')}</tbody>
            </table>
            ${discountAmount > 0 ? `<p class="total"><span>Discount</span><strong>- ${discountAmount.toLocaleString()} ကျပ်</strong></p>` : ''}
            <hr />
            <p class="total"><span>Total</span><strong>${total.toLocaleString()} ကျပ်</strong></p>
          `;
        const html = `
          <!doctype html>
          <html lang="my">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>${escapeHtml(shopName)} - Receipt</title>
              <style>
                @page { margin: 8mm; }
                * { box-sizing: border-box; }
                body { width: 80mm; max-width: 100%; margin: 0 auto; padding: 4mm; color: #111; font: 12px Arial, "Noto Sans Myanmar", sans-serif; overflow-wrap: anywhere; }
                h1 { margin: 0 0 4px; font-size: 18px; text-align: center; }
                .shop-detail, .thanks { color: #555; text-align: center; }
                p { margin: 6px 0; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { padding: 5px 2px; border-bottom: 1px solid #ddd; text-align: left; }
                th:last-child, td:last-child { text-align: right; }
                .total { display: flex; justify-content: space-between; gap: 8px; }
                @media print { body { width: 100%; padding: 0; } }
              </style>
            </head>
            <body>
              <h1>${escapeHtml(shopName)}</h1>
              ${shopAddress ? `<div class="shop-detail">${escapeHtml(shopAddress)}</div>` : ''}
              ${shopPhone ? `<div class="shop-detail">${escapeHtml(shopPhone)}</div>` : ''}
              <hr />
              ${content}
              <hr />
              <p class="thanks">ကျေးဇူးတင်ပါသည်ခင်ဗျာ။</p>
            </body>
          </html>
        `;
        await printHtmlDocument(html);
        return;
      }

      let BluetoothEscposPrinter;
      try {
        const printerModule = require('react-native-bluetooth-escpos-printer');
        BluetoothEscposPrinter = printerModule.BluetoothEscposPrinter;
      } catch (e) {
        Alert.alert('Printer မော်ဂျူး မရှိပါ', 'ဤစနစ်တွင် Bluetooth Printer မော်ဂျူး တပ်ဆင်ထားခြင်း မရှိသေးပါ။');
        return;
      }

      if (!BluetoothEscposPrinter) {
        Alert.alert('Error', 'Bluetooth Printer မော်ဂျူးကို ချိတ်ဆက်၍ မရပါ။');
        return;
      }

      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText(`🌟 ${shopName} 🌟\n`, { encoding: 'CP874', size: 1 });
      if (shopAddress) await BluetoothEscposPrinter.printText(`${shopAddress}\n`, {});
      if (shopPhone) await BluetoothEscposPrinter.printText(`ဖုန်း: ${shopPhone}\n`, {});
      await BluetoothEscposPrinter.printText("--------------------------------\n", {});

      await BluetoothEscposPrinter.printAlign(BluetoothEscposPrinter.ALIGN.LEFT);

      if (isService) {
        await BluetoothEscposPrinter.printText(`ဘောက်ချာနံပါတ်: ${serviceData?.voucher_no || 'SRV-ONLINE'}\n`, {});
        await BluetoothEscposPrinter.printText(`ရက်စွဲ: ${formatReceiptDate(serviceData?.created_at)}\n`, {});
        await BluetoothEscposPrinter.printText(`ဝယ်သူအမည်: ${serviceData?.customer_name || '-'}\n`, {});
        await BluetoothEscposPrinter.printText(`ဖုန်းနံပါတ်: ${serviceData?.phone || '-'}\n`, {});
        await BluetoothEscposPrinter.printText(`အပ်နှံပစ္စည်း: ${serviceData?.device_model || '-'}\n`, {});
        await BluetoothEscposPrinter.printText(`ချို့ယွင်းချက်: ${serviceData?.fault_description || '-'}\n`, {});
        await BluetoothEscposPrinter.printText("--------------------------------\n", {});
        await BluetoothEscposPrinter.printAlign(BluetoothEscposPrinter.ALIGN.RIGHT);
        await BluetoothEscposPrinter.printText(`ဝန်ဆောင်ခ: ${(Number(serviceData?.service_fee) || 0).toLocaleString()} ကျပ်\n`, { bold: 1 });
      } else {
        await BluetoothEscposPrinter.printText(`ဘေလ်နံပါတ်: ${saleData?.voucher_no || 'V-ONLINE'}\n`, {});
        await BluetoothEscposPrinter.printText(`ရက်စွဲ: ${formatReceiptDate(saleData?.created_at)}\n`, {});
        await BluetoothEscposPrinter.printText(`ငွေပေးချေမှု: ${saleData?.payment_method || 'Cash'}\n`, {});
        await BluetoothEscposPrinter.printText(`ဝယ်သူ: ${customerName || 'အမည်မရှိ'} (${customerPhone || '-'})\n`, {});
        await BluetoothEscposPrinter.printText("--------------------------------\n", {});

        if (Array.isArray(items)) {
          for (const item of items) {
            const itemName = item.name || 'Item';
            const qty = item.quantity || item.qty || 1;
            const price = parseFloat(item.selling_price) || parseFloat(item.price) || 0;
            const total = price * qty;
            await BluetoothEscposPrinter.printText(`${itemName}\n`, {});
            await BluetoothEscposPrinter.printText(`  ${qty} ခု x ${price.toLocaleString()} = ${total.toLocaleString()} ကျပ်\n`, {});
          }
        }

        await BluetoothEscposPrinter.printText("--------------------------------\n", {});

        if (discount > 0) {
          await BluetoothEscposPrinter.printAlign(BluetoothEscposPrinter.ALIGN.RIGHT);
          await BluetoothEscposPrinter.printText(`လျော့ငွေ: - ${discount.toLocaleString()} ကျပ်\n`, {});
        }

        await BluetoothEscposPrinter.printAlign(BluetoothEscposPrinter.ALIGN.RIGHT);
        await BluetoothEscposPrinter.printText(`စုစုပေါင်း Net Total: ${(finalTotal || saleData?.total_amount || 0).toLocaleString()} ကျပ်\n`, { bold: 1 });
      }

      await BluetoothEscposPrinter.printAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText("\nကျေးဇူးတင်ပါသည်ခင်ဗျာ 🙏\n", {});
      await BluetoothEscposPrinter.printText("Powered by KMO POS System\n\n\n", {});

      Alert.alert('အောင်မြင်သည်', 'ဘောက်ချာ ပရင့်ထုတ်ပြီးပါပြီ။');
    } catch (error) {
      console.log('Bluetooth Print Error:', error);
      const message = Platform.OS === 'web'
        ? error.message
        : 'ပရင်တာ ချိတ်ဆက်မှု မရှိပါ သို့မဟုတ် မမှန်ကန်ပါ။ (ပရင်တာ အရင်ချိတ်ဆက်ပါ)';
      Alert.alert('Print Error', message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isService ? '🛠️ ဝန်ဆောင်မှု ဘောက်ချာ (Service Receipt)' : '🧾 ဆိုင်ဘောက်ချာ (Receipt)'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.receiptCard}>
          <View style={styles.shopHeader}>
            <Text style={styles.starText}>🌟</Text>
            <Text style={styles.shopTitle}>{shopName}</Text>
            <Text style={styles.starText}>🌟</Text>
          </View>
          {shopAddress ? <Text style={styles.shopSubText}>{shopAddress}</Text> : null}
          {shopPhone ? <Text style={styles.shopSubText}>ဖုန်း: {shopPhone}</Text> : null}

          <View style={styles.divider} />

          {isService ? (
            <View>
              <View style={styles.metaBox}>
                <Text style={styles.metaText}>
                  ဘောက်ချာနံပါတ်: <Text style={{ fontWeight: 'bold', color: '#1a73e8' }}>{serviceData?.voucher_no || 'SRV-ONLINE'}</Text>
                </Text>
                <Text style={styles.metaText}>
                  ရက်စွဲ: {formatReceiptDate(serviceData?.created_at)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.customerBox}>
                <Text style={styles.customerText}>အမည်:      {serviceData?.customer_name || '-'}</Text>
                <Text style={styles.customerText}>ဖုန်းနံပါတ်:    {serviceData?.phone || '-'}</Text>

                <View style={styles.divider} />
                <Text style={styles.customerText}>အပ်နှံပစ္စည်း:   {serviceData?.device_model || '-'}</Text>
                <Text style={styles.customerText}>ချို့ယွင်းချက်:   {serviceData?.fault_description || '-'}</Text>
              </View>

              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>ဝန်ဆောင်ခ:</Text>
                <Text style={styles.totalValue}>{(Number(serviceData?.service_fee) || 0).toLocaleString()} ကျပ်</Text>
              </View>
              
<Text style={styles.footerText2}>* Services အပ်ထားသော ပစ္စည်းများ (၁) လအတွင်း လာမရွေးပါက တာဝန်မယူပါ။ </Text>
         <Text style={styles.footerText2}>* Service ပစ္စည်း လာရောက် ရွေးပါက ဤဘောင်ချာအား မဖြစ်မနေ ယူဆောင်လာရပါမည်။ </Text>
            </View>
          ) : (
            <View>
              <View style={styles.metaBox}>
                <Text style={styles.metaText}>
                  ဘေလ်နံပါတ်: <Text style={{ fontWeight: 'bold', color: '#1a73e8' }}>{saleData?.voucher_no || 'V-ONLINE'}</Text>
                </Text>
                <Text style={styles.metaText}>
                  ရက်စွဲ: {formatReceiptDate(saleData?.created_at)}
                </Text>
                <Text style={styles.metaText}>
                  ငွေပေးချေမှု: <Text style={{ fontWeight: 'bold', color: '#28a745' }}>{saleData?.payment_method || 'Cash'}</Text>
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.customerBox}>
                <Text style={styles.customerText}>ဝယ်သူ: {customerName || 'အမည်မရှိ'}</Text>
                <Text style={styles.customerText}>ဖုန်း: {customerPhone || '-'}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thText, { flex: 2 }]}>ပစ္စည်းအမည်</Text>
                <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>ခုရေ</Text>
                <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>နှုန်း</Text>
                <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>သင့်ငွေ</Text>
              </View>

              {items.map((item, index) => {
                const qty = item.quantity || item.qty || 1;
                const price = parseFloat(item.selling_price) || parseFloat(item.price) || 0;
                const itemTotal = price * qty;
                return (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tdText, { flex: 2, fontWeight: '500' }]} numberOfLines={1}>
                      {item.name || 'Item'}
                    </Text>
                    <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>{qty}</Text>
                    <Text style={[styles.tdText, { flex: 1, textAlign: 'right' }]}>{price.toLocaleString()}</Text>
                    <Text style={[styles.tdText, { flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#1a73e8' }]}>
                      {itemTotal.toLocaleString()}
                    </Text>
                  </View>
                );
              })}

              {discount > 0 && (
                <View style={styles.discountRow}>
                  <Text style={styles.discountText}>လျော့ငွေ:</Text>
                  <Text style={styles.discountValue}>- {discount.toLocaleString()} ကျပ်</Text>
                </View>
              )}

              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>စုစုပေါင်း Net Total:</Text>
                <Text style={styles.totalValue}>
                  {(finalTotal || saleData?.total_amount || 0).toLocaleString()} ကျပ်
                </Text>
              </View>
              
              {/* <Text style={styles.footerText2}>* Services အပ်ထားသော ပစ္စည်းများ (၁) လအတွင်း လာမရွေးပါက တာဝန်မယူပါ။ </Text>
              <Text style={styles.footerText2}>* Service ပစ္စည်း လာရောက် ရွေးပါက ဤဘောင်ချာအား မဖြစ်မနေ ယူဆောင်လာရပါမည်။ </Text>
            */}
            </View>
          )}

          <View style={styles.divider} />
          <Text style={styles.footerText}>ကျေးဇူးတင်ပါသည်ခင်ဗျာ။  🙏</Text>
          <Text style={styles.footerSubText}>Powered by KMO POS System</Text>
        </View>
      </ScrollView>

      <View style={styles.footerActionRow}>
        <TouchableOpacity style={styles.printBtn} onPress={handlePrintReceipt}>
          <Ionicons name="print-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.printBtnText}>ဘောက်ချာထုတ်ရန် (Print)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  scrollContent: { padding: 16, alignItems: 'center' },
  receiptCard: { width: '100%', maxWidth: 380, backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e1e1e1', elevation: 3 },
  shopHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  shopTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a73e8', marginHorizontal: 6, textAlign: 'center' },
  starText: { fontSize: 14 },
  shopSubText: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#ddd', borderStyle: 'dashed', marginVertical: 12 },
  metaBox: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8 },
  metaText: { fontSize: 12, color: '#444', marginBottom: 4 },
  customerBox: { marginBottom: 4 },
  customerText: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f1f3f4', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 4, marginBottom: 6 },
  thText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', alignItems: 'center' },
  tdText: { fontSize: 12, color: '#333' },
  discountRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  discountText: { fontSize: 12, color: '#dc3545', fontWeight: 'bold', marginRight: 8 },
  discountValue: { fontSize: 12, color: '#dc3545', fontWeight: 'bold' },
  totalSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eef6ff', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#d0e1fd' },
  totalLabel: { fontSize: 14, fontWeight: 'bold', color: '#111' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#1a73e8' },
  footerText: { fontSize: 12, textAlign: 'center', color: '#555', marginTop: 5, lineHeight: 18 },
  footerText2: { fontSize: 8, textAlign: 'left', color: '#555', marginTop: 2, lineHeight: 18 },
  footerSubText: { fontSize: 9, textAlign: 'center', color: '#aaa', marginTop: 6 },
  footerActionRow: { padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  printBtn: { backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8, elevation: 2 },
  printBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});