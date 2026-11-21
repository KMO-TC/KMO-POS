// App.js
import React, { useState, useEffect, useCallback } from "react";
import { View, ActivityIndicator, AppState, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./src/config/supabase";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import {
  getCachedUserProfile,
  initializeOfflineStore,
  saveUserProfile,
  syncPendingChanges,
} from "./src/services/offlineStore";

// Auth Screens
import LoginScreen from "./src/Auth/LoginScreens.js";
import ForgotPasswordScreen from "./src/Auth/ForgetPasswordScreen.js";

// Super Admin & Owner Dashboards
import SuperAdminDashboard from "./src/screens/SuperAdminDashboard.js"; 
import OwnerDashboardScreen from "./src/screens/OwnerDashboardScreen.js"; 

// Owner Dashboard Modules / Screens
import ProductInventoryScreen from "./src/screens/ProductInventoryScreen.js";
import SellerManagementScreen from "./src/screens/SellerManagementScreen.js";
import SellerDashboardScreen from "./src/screens/SellerDashboardScreen.js";
import ProfileScreen from "./src/screens/ProfitScreen.js";
import ExpensesScreen from "./src/screens/ExpenseScreen.js";
import LowStockScreen from "./src/screens/LowStockScreen.js";
import ServicesReportScreen from "./src/screens/ServicesReportScreen.js";
import TransactionScreen from "./src/screens/TransactionScreen.js";
import DebtScreen from "./src/screens/DebtScreen.js";
import ProfitLossReportScreen from "./src/screens/ProfitLossReportScreen.js";
import AboutScreen from "./src/screens/AboutScreen.js";

 import SellerPOSScreen from "./src/screens/POSScreen.js";

import ServicesScreen from "./src/screens/ServicesScreen.js";

 import SalesReportScreen from "./src/screens/SalesReportScreen.js";

import ReceiptPrintScreen from "./src/screens/ReceiptPrintScreen.js";

const Stack = createNativeStackNavigator();

function POSApp() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); 

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data?.role) {
        await saveUserProfile(userId, data);
        setUserRole(data.role.trim());
      } else {
        setUserRole('Seller');
      }
    } catch (error) {
      console.error('Error fetching role:', error);
      try {
        const cachedProfile = await getCachedUserProfile(userId);
        setUserRole(cachedProfile?.role?.trim() || 'Seller');
      } catch (cacheError) {
        console.error('Error reading cached user profile:', cacheError);
        setUserRole('Seller');
      }
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        await initializeOfflineStore();
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setInitializing(false);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        if (active) setInitializing(false);
      }
    };
    initialize();

    // Auth State အပြောင်းအလဲကို စောင့်ကြည့်ခြင်း
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        setInitializing(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  useEffect(() => {
    const synchronize = () => {
      syncPendingChanges().catch((error) => {
        console.error('Offline changes are still waiting to sync:', error);
      });
    };
    const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
    const intervalId = setInterval(synchronize, 30000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') synchronize();
    });
    if (isWeb) {
      window.addEventListener('online', synchronize);
    }

    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
      if (isWeb) {
        window.removeEventListener('online', synchronize);
      }
    };
  }, []);

  useEffect(() => {
    if (__DEV__ || Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let active = true;
    const appBaseUrl = new URL('./', window.location.href);
    navigator.serviceWorker.register(new URL('service-worker.js', appBaseUrl), {
      scope: appBaseUrl.pathname,
    })
      .then(async (registration) => {
        await navigator.serviceWorker.ready;
        if (!active) return;

        const manifestResponse = await fetch(new URL('offline-assets.json', appBaseUrl));
        if (!manifestResponse.ok) {
          throw new Error(`Offline asset manifest request failed: ${manifestResponse.status}`);
        }
        const offlineAssets: string[] = await manifestResponse.json();
        const sameOriginResources = typeof performance === 'undefined'
          ? []
          : performance.getEntriesByType('resource')
            .map((entry) => new URL(entry.name))
            .filter((url) => (
              url.origin === appBaseUrl.origin
              && url.pathname.startsWith(appBaseUrl.pathname)
            ))
            .map((url) => `./${url.pathname.slice(appBaseUrl.pathname.length)}${url.search}`);
        registration.active?.postMessage({
          type: 'CACHE_URLS',
          urls: Array.from(new Set(['./', './offline-assets.json', ...offlineAssets, ...sameOriginResources])),
        });
      })
      .catch((error) => {
        console.error('Unable to register offline web support:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // 🔓 Login မဝင်ရသေးပါက
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : userRole === "SuperAdmin" ? (
          // 👑 Super Admin Dashboard
          <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
        ) : userRole === "Owner" ? (
          // 🏪 Owner Dashboard နှင့် ၎င်း၏ မော်ဂျူး Screen များ
          <>
            <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
            <Stack.Screen name="ProductInventory" component={ProductInventoryScreen} />
            <Stack.Screen name="SellerManagement" component={SellerManagementScreen} />
              <Stack.Screen name="SalesReport" component={SalesReportScreen} />
              <Stack.Screen name="ProfitReport" component={ProfileScreen} />
              <Stack.Screen name="Expenses" component={ExpensesScreen} />
              <Stack.Screen name="StockBalance" component={LowStockScreen} />
              <Stack.Screen name="ServicesReport" component={ServicesReportScreen} />
              <Stack.Screen name="TransactionScreen" component={TransactionScreen} />
              <Stack.Screen name="DebtManagement" component={DebtScreen} />
              <Stack.Screen name="ProfitLossReport" component={ProfitLossReportScreen} />
              <Stack.Screen name="About" component={AboutScreen} />
               <Stack.Screen name="SellerPOS" component={SellerPOSScreen} />

          <Stack.Screen name="ReceiptPrint" component={ReceiptPrintScreen} />
              <Stack.Screen name="Services" component={ServicesScreen} />
            {/* ကျန်ရှိသော Owner Module Screen များကို ဤနေရာတွင် ထပ်ထည့်ပါ */}
            {/* <Stack.Screen name="SalesReport" component={SalesReportScreen} /> */}
            {/* <Stack.Screen name="Expenses" component={ExpensesScreen} /> */}
            {/* <Stack.Screen name="StaffManagement" component={StaffManagementScreen} /> */}
          </>
        ) : (
          <>
          {/* // 🛒 Seller POS Page */}
          <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
          <Stack.Screen name="SellerPOS" component={SellerPOSScreen} />
          <Stack.Screen name="ReceiptPrint" component={ReceiptPrintScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <POSApp />
    </LanguageProvider>
  );
}