import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";

const fullLogo = require("./assets/logo.png");
const headerIcon = require("./assets/icon.png");

// Web/Expo local backend URL. For Android emulator later, change this to http://10.0.2.2:5000
const API_BASE_URL = "http://localhost:5000";

const normaliseAvailability = (value) => {
  const v = String(value || "").toLowerCase().trim();
  if (["yes", "available", "true", "1"].includes(v)) return "available";
  return "unavailable";
};

const normaliseDish = (dish) => ({
  ...dish,
  id: String(dish.id || dish._id || dish.name || Date.now()),
  name: dish.name || "Untitled dish",
  description: dish.description || "No description added.",
  category: dish.category || "Mains",
  dietary_flags: dish.dietary_flags || dish.dietaryFlags || "none",
  availability: normaliseAvailability(dish.availability),
  price: Number(dish.price || 0),
  file: dish.file || "",
});

const normaliseCategoryName = (category) => {
  if (typeof category === "string") return category;
  return category.name || category.category || category.title || category.category_name || "";
};

const normaliseCategoryRecord = (category, index = 0) => {
  const name = normaliseCategoryName(category).trim();
  return {
    id: String((category && typeof category === "object" && (category.id || category._id)) || `local-category-${index}-${name}`),
    name,
  };
};

const normaliseUser = (user) => ({
  ...user,
  id: String(user.id || user._id || user.email || Date.now()),
  name: user.name || user.fullName || user.email || "Staff User",
  email: user.email || "No email",
  password: user.password || "123456",
  role: user.role || "staff",
  active: user.active !== false && user.active !== "false" && user.active !== "no",
});

const readSavedQuickLogin = () => {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("beanSceneQuickLogin");
      if (saved === "false") return false;
      if (saved === "true") return true;
    }
  } catch (error) {
    // Native/mobile preview may not have localStorage.
  }
  return true;
};

const saveQuickLoginSetting = (enabled) => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("beanSceneQuickLogin", enabled ? "true" : "false");
    }
  } catch (error) {
    // Keep the in-app setting even if browser storage is unavailable.
  }
};

const formatPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

const getTableArea = (table) => {
  const prefix = String(table || "").charAt(0).toUpperCase();
  if (prefix === "M") return "Main";
  if (prefix === "O") return "Outside";
  if (prefix === "B") return "Balcony";
  return "Table";
};

const getTableNumber = (table) => String(table || "").replace(/^[A-Za-z]/, "");
const getTableLabel = (table) => `${getTableArea(table)} Table ${getTableNumber(table)}`.trim();

/* ========================
   BEAN SCENE THEME
======================== */
const Colors = {
  darkBlue: "#083944",
  midBlue: "#2F6672",
  lightBlue: "#4AA1B5",
  gold: "#EBC136",
  paleGold: "#F8E8B5",
  darkGold: "#CC9E09",
  lightGrey: "#E0E0E0",
  white: "#FFFFFF",
  screenBg: "#F5F5F5",
  inputBg: "#F9F9F9",
  destructive: "#DC2626",
  successBg: "#F0FDF4",
  successBorder: "#BBF7D0",
  successText: "#15803D",
  inProgressBg: "#FEF3C7",
  inProgressText: "#B45309",
  completedBg: "#DCFCE7",
  completedText: "#15803D",
  unavailableBg: "#FEE2E2",
  unavailableText: "#DC2626",
};

const Spacing = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24 };
const Radius = { card: 16, input: 12, button: 12, pill: 999 };

/* ========================
   INITIAL DATA
======================== */
const INITIAL_DISHES = [
  {
    id: "1",
    name: "Coke",
    description: "Classic soft drink served chilled.",
    category: "Drinks",
    dietary_flags: "DF",
    availability: "available",
    price: 5,
  },
  {
    id: "2",
    name: "Burger",
    description: "Beef burger with lettuce, tomato, cheese and house sauce.",
    category: "Mains",
    dietary_flags: "Contains Dairy",
    availability: "available",
    price: 12,
  },
  {
    id: "3",
    name: "Garden Salad",
    description: "Fresh mixed salad with seasonal vegetables.",
    category: "Sides",
    dietary_flags: "V, GF",
    availability: "available",
    price: 9,
  },
];

const INITIAL_USERS = [
  { id: "1", name: "Admin User", email: "admin@test.com", password: "123456", role: "manager", active: true },
  { id: "2", name: "Staff User", email: "staff@test.com", password: "123456", role: "staff", active: true },
];

const INITIAL_CATEGORIES = ["Entrées", "Mains", "Desserts", "Drinks", "Sides", "Specials"];
const INITIAL_CATEGORY_RECORDS = INITIAL_CATEGORIES.map((name, index) => ({ id: `local-category-${index}`, name }));

const TABLES = ["M1", "M2", "M3", "M4", "M5", "O1", "O2", "O3", "B1", "B2"];

/* ========================
   SCREENS
======================== */
const SCREENS = {
  LOGIN: "LOGIN",
  DASHBOARD: "DASHBOARD",
  ORDER: "ORDER",
  ORDER_SUMMARY: "ORDER_SUMMARY",
  ORDERS: "ORDERS",
  MANAGE_DISHES: "MANAGE_DISHES",
  MANAGE_USERS: "MANAGE_USERS",
  CATEGORIES: "CATEGORIES",
  REPORTS: "REPORTS",
  DEBUG: "DEBUG",
};

export default function App() {
  const { width } = useWindowDimensions();
  const isWideLayout = width >= 900;
  const [screen, setScreen] = useState(SCREENS.LOGIN);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [userRole, setUserRole] = useState("manager");
  const [dishes, setDishes] = useState(INITIAL_DISHES);
  const [users, setUsers] = useState(INITIAL_USERS);
  const [categoryRecords, setCategoryRecords] = useState(INITIAL_CATEGORY_RECORDS);
  const [cart, setCart] = useState({});
  const [orders, setOrders] = useState([]);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState("M1");
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [orderNotes, setOrderNotes] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [apiError, setApiError] = useState("");
  const [quickLoginEnabled, setQuickLoginEnabled] = useState(readSavedQuickLogin);
  const [dishForm, setDishForm] = useState(null);
  const [staffForm, setStaffForm] = useState(null);
  const [categoryForm, setCategoryForm] = useState(null);

  const isManager = userRole === "manager";
  const categories = useMemo(() => {
    const names = categoryRecords.map((category) => category.name).filter(Boolean);
    return [...new Set(names)];
  }, [categoryRecords]);

  const getFromApi = async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`${endpoint} returned ${response.status}`);
    }
    return response.json();
  };

  const postToApi = async (endpoint, body) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`${endpoint} returned ${response.status}`);
    }
    return response.json();
  };

  const putToApi = async (endpoint, body) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`${endpoint} returned ${response.status}`);
    }
    return response.json();
  };

  const deleteFromApi = async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(`${endpoint} returned ${response.status}`);
    }
    return response.json();
  };

  const loadApiData = async () => {
    setIsLoadingData(true);
    setApiError("");

    try {
      const [apiDishes, apiCategories, apiUsers, apiOrders] = await Promise.all([
        getFromApi("/api/dishes"),
        getFromApi("/api/category"),
        getFromApi("/api/users"),
        getFromApi("/api/orders"),
      ]);

      const normalisedDishes = Array.isArray(apiDishes) ? apiDishes.map(normaliseDish) : [];
      const backendCategoryRecords = Array.isArray(apiCategories)
        ? apiCategories.map(normaliseCategoryRecord).filter((category) => category.name)
        : [];
      const categoriesFromDishes = [...new Set(normalisedDishes.map((dish) => dish.category).filter(Boolean))];

      if (normalisedDishes.length > 0) setDishes(normalisedDishes);
      if (backendCategoryRecords.length > 0) setCategoryRecords(backendCategoryRecords);
      else if (categoriesFromDishes.length > 0) {
        setCategoryRecords(categoriesFromDishes.map((name, index) => ({ id: `local-category-dish-${index}`, name })));
      }

      if (Array.isArray(apiUsers) && apiUsers.length > 0) {
        setUsers(apiUsers.map(normaliseUser));
      }

      if (Array.isArray(apiOrders)) {
        setOrders(apiOrders.map((order) => ({
          ...order,
          id: String(order.id || Date.now()),
          items: Array.isArray(order.items) ? order.items : [],
          total: Number(order.total || 0),
          status: order.status || "In Progress",
          createdAt: order.createdAt || "Saved order",
        })));
      }
    } catch (error) {
      setApiError("Could not load backend data. Make sure BE-main is running on http://localhost:5000.");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadApiData();
  }, []);

  const login = (role = "manager") => {
    setUserRole(role);
    setLoginError("");
    setScreen(SCREENS.DASHBOARD);
  };

  const loginWithCredentials = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setLoginError("");

    if (!cleanEmail || !password.trim()) {
      setLoginError("Enter an email and password, or use Quick Login if it is enabled.");
      return;
    }

    try {
      const result = await postToApi("/api/auth/login", { email: cleanEmail, password });
      if (result?.success && result?.data) {
        login(result.data.role || "staff");
        return;
      }
    } catch (error) {
      // Fall back to the users already loaded into the app.
    }

    const localUser = users.find((user) =>
      String(user.email || "").toLowerCase() === cleanEmail && String(user.password || "") === password
    );

    if (localUser && localUser.active !== false) {
      login(localUser.role || "staff");
      return;
    }

    setLoginError("Login failed. Check the email/password or make sure the backend is running.");
  };

  const logout = () => {
    setCart({});
    setOrderSuccess(false);
    setEmail("");
    setPassword("");
    setScreen(SCREENS.LOGIN);
  };

  const updateQuickLogin = (enabled) => {
    setQuickLoginEnabled(enabled);
    saveQuickLoginSetting(enabled);
  };

  const addToCart = (dish) => {
    if (dish.availability !== "available") return;
    setOrderSuccess(false);
    setCart((prev) => ({
      ...prev,
      [dish.id]: {
        ...dish,
        qty: (prev[dish.id]?.qty || 0) + 1,
      },
    }));
  };

  const removeFromCart = (id) => {
    setOrderSuccess(false);
    setCart((prev) => {
      if (!prev[id]) return prev;
      if (prev[id].qty === 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: { ...prev[id], qty: prev[id].qty - 1 } };
    });
  };

  const cartItems = Object.values(cart);
  const cartItemCount = cartItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const total = cartItems.reduce((sum, i) => sum + i.qty * i.price, 0);

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const matchesCategory = selectedCategory === "All" || dish.category === selectedCategory;
      const term = search.toLowerCase();
      const matchesSearch =
        dish.name.toLowerCase().includes(term) ||
        dish.description.toLowerCase().includes(term) ||
        dish.dietary_flags.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [dishes, selectedCategory, search]);

  const startAddDish = () => {
    setDishForm({
      mode: "add",
      id: "",
      name: "",
      description: "",
      category: categories[0] || "Mains",
      dietary_flags: "none",
      availability: "available",
      price: "",
      file: "",
    });
  };

  const startEditDish = (dish) => {
    setDishForm({
      mode: "edit",
      id: dish.id,
      name: dish.name,
      description: dish.description,
      category: dish.category,
      dietary_flags: dish.dietary_flags,
      availability: dish.availability,
      price: String(dish.price),
      file: dish.file || "",
    });
  };

  const saveDishForm = async () => {
    if (!dishForm) return;
    const payload = {
      name: dishForm.name.trim(),
      description: dishForm.description.trim() || "No description added.",
      category: dishForm.category || "Mains",
      dietary_flags: dishForm.dietary_flags.trim() || "none",
      availability: dishForm.availability,
      price: Number(dishForm.price || 0),
      file: dishForm.file || "",
    };

    if (!payload.name || payload.price <= 0) {
      setApiError("Dish needs a name and a price greater than $0.00.");
      return;
    }

    setApiError("");
    if (dishForm.mode === "edit") {
      setDishes((prev) => prev.map((dish) => dish.id === dishForm.id ? normaliseDish({ ...dish, ...payload }) : dish));
      setCart((prev) => {
        const copy = { ...prev };
        if (copy[dishForm.id]) copy[dishForm.id] = { ...copy[dishForm.id], ...payload, price: payload.price };
        return copy;
      });
      setDishForm(null);
      try {
        await putToApi(`/api/dishes/update/${dishForm.id}`, payload);
        await loadApiData();
      } catch (error) {
        setApiError("Dish was updated in the app, but backend update failed.");
      }
    } else {
      const localDish = normaliseDish({ ...payload, id: Date.now().toString() });
      setDishes((prev) => [localDish, ...prev]);
      setDishForm(null);
      try {
        await postToApi("/api/dishes/create", payload);
        await loadApiData();
      } catch (error) {
        setApiError("Dish was added in the app, but backend save failed.");
      }
    }
  };

  const deleteDish = async (id) => {
    setDishes((prev) => prev.filter((dish) => dish.id !== id));
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    try {
      await deleteFromApi(`/api/dishes/delete/${id}`);
    } catch (error) {
      setApiError("Dish was removed from the app, but backend delete failed.");
    }
  };

  const startAddStaff = () => {
    setStaffForm({
      mode: "add",
      id: "",
      name: "",
      email: "",
      password: "123456",
      role: "staff",
      active: true,
    });
  };

  const startEditStaff = (staff) => {
    setStaffForm({
      mode: "edit",
      id: staff.id,
      name: staff.name,
      email: staff.email,
      password: staff.password || "123456",
      role: staff.role || "staff",
      active: staff.active !== false,
    });
  };

  const saveStaffForm = async () => {
    if (!staffForm) return;
    const payload = {
      name: staffForm.name.trim() || "Staff User",
      email: staffForm.email.trim().toLowerCase(),
      password: staffForm.password || "123456",
      role: staffForm.role || "staff",
      active: staffForm.active !== false,
    };

    if (!payload.email) {
      setApiError("Staff account needs an email address.");
      return;
    }

    setApiError("");
    if (staffForm.mode === "edit") {
      setUsers((prev) => prev.map((staff) => staff.id === staffForm.id ? normaliseUser({ ...staff, ...payload }) : staff));
      setStaffForm(null);
      try {
        await putToApi(`/api/users/update/${staffForm.id}`, payload);
        await loadApiData();
      } catch (error) {
        setApiError("Staff member was updated in the app, but backend update failed.");
      }
    } else {
      const localStaff = normaliseUser({ ...payload, id: Date.now().toString() });
      setUsers((prev) => [localStaff, ...prev]);
      setStaffForm(null);
      try {
        await postToApi("/api/users/create", payload);
        await loadApiData();
      } catch (error) {
        setApiError("Staff member was added in the app, but backend save failed.");
      }
    }
  };

  const deleteStaff = async (id) => {
    setUsers((prev) => prev.filter((staff) => staff.id !== id));
    try {
      await deleteFromApi(`/api/users/delete/${id}`);
    } catch (error) {
      setApiError("Staff member was removed from the app, but backend delete failed.");
    }
  };

  const startAddCategory = () => {
    setCategoryForm({ mode: "add", id: "", name: "" });
  };

  const startEditCategory = (category) => {
    setCategoryForm({ mode: "edit", id: category.id, name: category.name });
  };

  const saveCategoryForm = async () => {
    if (!categoryForm) return;
    const name = categoryForm.name.trim();
    if (!name) {
      setApiError("Category needs a name.");
      return;
    }

    setApiError("");
    if (categoryForm.mode === "edit") {
      const oldName = categoryRecords.find((category) => category.id === categoryForm.id)?.name;
      setCategoryRecords((prev) => prev.map((category) => category.id === categoryForm.id ? { ...category, name } : category));
      if (oldName) {
        setDishes((prev) => prev.map((dish) => dish.category === oldName ? { ...dish, category: name } : dish));
      }
      setCategoryForm(null);
      try {
        if (!categoryForm.id.startsWith("local-category")) {
          await putToApi(`/api/category/update/${categoryForm.id}`, { name });
          await loadApiData();
        }
      } catch (error) {
        setApiError("Category was updated in the app, but backend update failed.");
      }
    } else {
      const localCategory = { id: `local-category-${Date.now()}`, name };
      setCategoryRecords((prev) => [localCategory, ...prev]);
      setCategoryForm(null);
      try {
        await postToApi("/api/category/create", { name });
        await loadApiData();
      } catch (error) {
        setApiError("Category was added in the app, but backend save failed.");
      }
    }
  };

  const deleteCategory = async (category) => {
    setCategoryRecords((prev) => prev.filter((item) => item.id !== category.id));
    if (selectedCategory === category.name) setSelectedCategory("All");
    try {
      if (!category.id.startsWith("local-category")) {
        await deleteFromApi(`/api/category/delete/${category.id}`);
      }
    } catch (error) {
      setApiError("Category was removed from the app, but backend delete failed.");
    }
  };

  const placeOrder = async () => {
    if (Object.keys(cart).length === 0) return;

    const newOrder = {
      id: Date.now().toString(),
      table: selectedTable,
      tableLabel: getTableLabel(selectedTable),
      items: Object.values(cart),
      total,
      status: "In Progress",
      notes: orderNotes || "No notes",
      createdAt: new Date().toLocaleString(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    try {
      await postToApi("/api/orders/create", newOrder);
    } catch (error) {
      setApiError("Order was kept in the app, but it could not be saved to the backend.");
    }

    setCart({});
    setOrderNotes("");
    setOrderSuccess(true);
    setScreen(SCREENS.ORDER);
  };

  const toggleOrderStatus = async (order) => {
    const nextStatus = order.status === "Completed" ? "In Progress" : "Completed";
    const updatedOrder = { ...order, status: nextStatus };
    setOrders((prev) => prev.map((item) => item.id === order.id ? updatedOrder : item));

    try {
      await putToApi(`/api/orders/update/${order.id}`, [updatedOrder]);
    } catch (error) {
      setApiError("Order status was updated in the app, but backend update failed.");
    }
  };

  if (screen === SCREENS.LOGIN) {
    return (
      <SafeAreaView style={styles.loginScreen}>
        <View style={styles.loginWrapper}>
          <View style={styles.logoBox}>
            <Image source={fullLogo} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.loginSubtitle}>Ordering System — Staff Access Only</Text>

          <View style={styles.loginCard}>
            <Text style={styles.screenTitle}>Login</Text>
            <Text style={styles.secondaryText}>Enter your staff account details to continue.</Text>

            {loginError ? <Text style={styles.warningBox}>{loginError}</Text> : null}

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@test.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <PrimaryButton title="Sign In" onPress={loginWithCredentials} />
          </View>

          {quickLoginEnabled ? (
            <View style={styles.demoPanel}>
              <Text style={styles.demoTitle}>Quick Login / Demo Accounts</Text>
              <TouchableOpacity style={styles.demoRow} onPress={() => login("manager")}>
                <View>
                  <Text style={styles.demoName}>Admin User</Text>
                  <Text style={styles.demoEmail}>admin@test.com</Text>
                </View>
                <Badge label="Manager" type="manager" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.demoRow} onPress={() => login("staff")}>
                <View>
                  <Text style={styles.demoName}>Staff User</Text>
                  <Text style={styles.demoEmail}>staff@test.com</Text>
                </View>
                <Badge label="Staff" type="staff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.DASHBOARD) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <Header title="Bean Scene" subtitle="Mobile Ordering" rightTitle="Logout" onRight={logout} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.screenTitle}>Staff Dashboard</Text>
          <Text style={styles.secondaryText}>Select an option below to manage the ordering system.</Text>

          <View style={styles.kpiRow}>
            <KpiCard label="Orders" value={orders.length} />
            <KpiCard label="In Progress" value={orders.filter((o) => o.status === "In Progress").length} type="warning" />
            <KpiCard label="Completed" value={orders.filter((o) => o.status === "Completed").length} type="success" />
          </View>

          <MenuButton title="Take Order" subtitle="Select table, add dishes and submit orders" onPress={() => setScreen(SCREENS.ORDER)} />
          <MenuButton title="View Orders" subtitle="Track in-progress and completed orders" onPress={() => setScreen(SCREENS.ORDERS)} />

          {isManager && (
            <>
              <MenuButton title="Manage Dishes" subtitle="Add, edit and remove menu items" onPress={() => setScreen(SCREENS.MANAGE_DISHES)} />
              <MenuButton title="Manage Categories" subtitle="Create and update menu categories" onPress={() => setScreen(SCREENS.CATEGORIES)} />
              <MenuButton title="Manage Staff" subtitle="Manage staff accounts and roles" onPress={() => setScreen(SCREENS.MANAGE_USERS)} />
              <MenuButton title="Reports" subtitle="View ordering activity and performance" onPress={() => setScreen(SCREENS.REPORTS)} />
              <MenuButton title="Debug Settings" subtitle="Manager-only quick login controls" onPress={() => setScreen(SCREENS.DEBUG)} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.ORDER) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <Header title="Take Order" leftTitle="Back" onLeft={() => setScreen(SCREENS.DASHBOARD)} />
        <View style={styles.orderFloatingScreen}>
          <ScrollView
            style={styles.orderPageScroll}
            contentContainerStyle={[
              styles.orderLayout,
              summaryExpanded ? styles.orderLayoutWithExpandedSummary : styles.orderLayoutWithCollapsedSummary,
              isWideLayout && styles.orderLayoutWide,
            ]}
          >
            <View style={styles.menuPanel}>
              <TextInput
                style={styles.input}
                placeholder="Search menu items"
                value={search}
                onChangeText={setSearch}
              />

              {isLoadingData ? <Text style={styles.infoBox}>Loading menu from backend...</Text> : null}
              {apiError ? <Text style={styles.warningBox}>{apiError}</Text> : null}
              {orderSuccess ? <Text style={styles.successBox}>Order placed successfully.</Text> : null}

              <TouchableOpacity style={styles.refreshButton} onPress={loadApiData}>
                <Text style={styles.refreshButtonText}>Refresh menu from Firebase/backend</Text>
              </TouchableOpacity>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryScrollContent}
              >
                {["All", ...categories].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.menuList}>
                {filteredDishes.length > 0 ? (
                  filteredDishes.map((item) => (
                    <DishCard
                      key={item.id}
                      item={item}
                      qty={cart[item.id]?.qty || 0}
                      onAdd={() => addToCart(item)}
                      onRemove={() => removeFromCart(item.id)}
                    />
                  ))
                ) : (
                  <View style={styles.card}>
                    <Text style={styles.secondaryText}>No menu items found. Check the backend or clear the search/category filter.</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={isWideLayout ? styles.floatingOrderPanelWide : styles.floatingOrderPanel}>
            <TouchableOpacity style={styles.floatingOrderHeader} onPress={() => setSummaryExpanded((value) => !value)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Order Summary</Text>
                <Text style={styles.secondaryText}>{getTableLabel(selectedTable)} • {cartItemCount} item{cartItemCount === 1 ? "" : "s"} • {formatPrice(total)}</Text>
              </View>
              <Text style={styles.floatingOrderToggle}>{summaryExpanded ? "Hide ↓" : "Show ↑"}</Text>
            </TouchableOpacity>

            {summaryExpanded && (
              <ScrollView style={styles.floatingOrderBody} contentContainerStyle={styles.floatingOrderBodyContent} nestedScrollEnabled>
                <Text style={styles.inputLabel}>Table / Area</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll} contentContainerStyle={styles.tableScrollContent}>
                  {TABLES.map((table) => (
                    <TouchableOpacity
                      key={table}
                      style={[styles.tableChip, selectedTable === table && styles.tableChipActive]}
                      onPress={() => setSelectedTable(table)}
                    >
                      <Text style={[styles.tableChipText, selectedTable === table && styles.tableChipTextActive]}>{getTableLabel(table)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Items Added</Text>
                <View style={styles.cartItems}>
                  {cartItems.length === 0 ? (
                    <Text style={styles.secondaryText}>No items added yet. Add items from the menu list.</Text>
                  ) : (
                    cartItems.map((i) => (
                      <View key={i.id} style={styles.cartRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bodyText}>{i.name}</Text>
                          <Text style={styles.secondaryText}>Quantity: {i.qty}</Text>
                        </View>
                        <Text style={styles.priceText}>{formatPrice(i.qty * i.price)}</Text>
                      </View>
                    ))
                  )}
                </View>

                <Text style={styles.inputLabel}>Notes / Dietary Requirements</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Example: no sugar, gluten free, extra sauce"
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                  multiline
                />

                <View style={styles.totalRow}>
                  <Text style={styles.sectionTitle}>Total</Text>
                  <Text style={styles.totalText}>{formatPrice(total)}</Text>
                </View>
                <PrimaryButton title="Place Order" onPress={placeOrder} disabled={cartItems.length === 0} />
                <SecondaryButton title="Open Full Summary Page" onPress={() => setScreen(SCREENS.ORDER_SUMMARY)} />
              </ScrollView>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.ORDER_SUMMARY) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <Header title="Order Summary" leftTitle="Back to Menu" onLeft={() => setScreen(SCREENS.ORDER)} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {apiError ? <Text style={styles.warningBox}>{apiError}</Text> : null}

          <View style={styles.orderSummary}>
            <Text style={styles.cardTitle}>Table / Area</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll} contentContainerStyle={styles.tableScrollContent}>
              {TABLES.map((table) => (
                <TouchableOpacity
                  key={table}
                  style={[styles.tableChip, selectedTable === table && styles.tableChipActive]}
                  onPress={() => setSelectedTable(table)}
                >
                  <Text style={[styles.tableChipText, selectedTable === table && styles.tableChipTextActive]}>{getTableLabel(table)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.secondaryText}>Tables are labelled as Main Table, Outside Table and Balcony Table.</Text>
          </View>

          <View style={styles.orderSummary}>
            <Text style={styles.cardTitle}>Items Added</Text>
            <View style={styles.cartItems}>
              {cartItems.length === 0 ? (
                <Text style={styles.secondaryText}>No items added yet. Go back to the menu and add items first.</Text>
              ) : (
                cartItems.map((i) => (
                  <View key={i.id} style={styles.cartRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bodyText}>{i.name}</Text>
                      <Text style={styles.secondaryText}>Quantity: {i.qty}</Text>
                    </View>
                    <Text style={styles.priceText}>{formatPrice(i.qty * i.price)}</Text>
                  </View>
                ))
              )}
            </View>
            <SecondaryButton title="Back to Menu Items" onPress={() => setScreen(SCREENS.ORDER)} />
          </View>

          <View style={styles.orderSummary}>
            <Text style={styles.inputLabel}>Notes / Dietary Requirements</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Example: no sugar, gluten free, extra sauce"
              value={orderNotes}
              onChangeText={setOrderNotes}
              multiline
            />

            <View style={styles.totalRow}>
              <Text style={styles.sectionTitle}>Total</Text>
              <Text style={styles.totalText}>{formatPrice(total)}</Text>
            </View>
            <PrimaryButton title="Place Order" onPress={placeOrder} disabled={cartItems.length === 0} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.ORDERS) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <Header title="Orders" leftTitle="Back" onLeft={() => setScreen(SCREENS.DASHBOARD)} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {apiError ? <Text style={styles.warningBox}>{apiError}</Text> : null}
          <View style={styles.kpiRow}>
            <KpiCard label="Total" value={orders.length} />
            <KpiCard label="In Progress" value={orders.filter((o) => o.status === "In Progress").length} type="warning" />
            <KpiCard label="Completed" value={orders.filter((o) => o.status === "Completed").length} type="success" />
          </View>

          {orders.length === 0 ? (
            <View style={styles.card}><Text style={styles.secondaryText}>No orders have been placed yet.</Text></View>
          ) : orders.map((order) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardRowBetween}>
                <View>
                  <Text style={styles.cardTitle}>{order.tableLabel || getTableLabel(order.table)}</Text>
                  <Text style={styles.secondaryText}>{order.createdAt}</Text>
                </View>
                <Badge label={order.status} type={order.status === "Completed" ? "completed" : "inProgress"} />
              </View>
              {order.items.map((item) => <Text key={`${order.id}-${item.id || item.name}`} style={styles.bodyText}>• {item.name} x {item.qty}</Text>)}
              <Text style={styles.secondaryText}>Notes: {order.notes}</Text>
              <Text style={styles.priceText}>Total: {formatPrice(order.total)}</Text>
              <SecondaryButton
                title={order.status === "Completed" ? "Reopen Order" : "Mark Completed"}
                onPress={() => toggleOrderStatus(order)}
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.REPORTS) {
    const completedOrders = orders.filter((o) => o.status === "Completed");
    const completed = completedOrders.length;
    const revenue = completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const itemTotals = {};

    completedOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = String(item.id || item.name);
        const qty = Number(item.qty || 1);
        if (!itemTotals[key]) {
          itemTotals[key] = { id: key, name: item.name, qty: 0, total: 0 };
        }
        itemTotals[key].qty += qty;
        itemTotals[key].total += qty * Number(item.price || 0);
      });
    });

    const popularItems = Object.values(itemTotals)
      .filter((item) => item.qty > 0)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
    const maxQty = popularItems[0]?.qty || 1;

    return (
      <SafeAreaView style={styles.screenContainer}>
        <Header title="Reports" leftTitle="Back" onLeft={() => setScreen(SCREENS.DASHBOARD)} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.kpiGrid}>
            <KpiCard label="Total Orders" value={orders.length} />
            <KpiCard label="Completed" value={completed} type="success" />
            <KpiCard label="Revenue" value={formatPrice(revenue)} type="gold" />
            <KpiCard label="Avg Value" value={completed ? formatPrice(revenue / completed) : "$0.00"} />
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ordering Summary</Text>
            <Text style={styles.bodyText}>This report only counts completed orders as purchases. Newly added menu items will not appear as popular until they are actually ordered and completed.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Popular Items</Text>
            {popularItems.length === 0 ? (
              <Text style={styles.secondaryText}>No popular items yet. Complete an order first to generate this report.</Text>
            ) : popularItems.map((item, idx) => (
              <View key={item.id} style={styles.reportRow}>
                <View style={styles.cardRowBetween}>
                  <Text style={styles.bodyText}>{idx + 1}. {item.name}</Text>
                  <Text style={styles.priceText}>{item.qty} sold</Text>
                </View>
                <View style={[styles.reportBar, { width: `${Math.max(12, (item.qty / maxQty) * 100)}%` }]} />
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.DEBUG) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <Header title="Debug Settings" leftTitle="Back" onLeft={() => setScreen(SCREENS.DASHBOARD)} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manager-only Debug Controls</Text>
            <Text style={styles.secondaryText}>Use this only while testing. Turning Quick Login off hides the demo account buttons from the login screen.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardRowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Quick Login</Text>
                <Text style={styles.secondaryText}>{quickLoginEnabled ? "Enabled — demo buttons show on the login screen." : "Disabled — staff must manually enter email and password."}</Text>
              </View>
              <Badge label={quickLoginEnabled ? "Enabled" : "Disabled"} type={quickLoginEnabled ? "completed" : "inProgress"} />
            </View>
            <PrimaryButton
              title={quickLoginEnabled ? "Disable Quick Login" : "Enable Quick Login"}
              onPress={() => updateQuickLogin(!quickLoginEnabled)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.MANAGE_DISHES) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <Header title="Manage Dishes" leftTitle="Back" onLeft={() => setScreen(SCREENS.DASHBOARD)} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manage Dishes</Text>
            <Text style={styles.secondaryText}>Add, edit or remove menu items used by the ordering screen.</Text>
            <PrimaryButton title="Add New Dish" onPress={startAddDish} />
          </View>

          {apiError ? <Text style={styles.warningBox}>{apiError}</Text> : null}

          {dishForm ? (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>{dishForm.mode === "edit" ? "Edit Dish" : "Add Dish"}</Text>

              <Text style={styles.inputLabel}>Dish Name</Text>
              <TextInput style={styles.input} placeholder="Example: Chicken Schnitzel" value={dishForm.name} onChangeText={(value) => setDishForm((prev) => ({ ...prev, name: value }))} />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput style={[styles.input, styles.notesInput]} placeholder="Short menu description" value={dishForm.description} onChangeText={(value) => setDishForm((prev) => ({ ...prev, description: value }))} multiline />

              <Text style={styles.inputLabel}>Category</Text>
              <ChoiceChips
                options={categories.length ? categories : INITIAL_CATEGORIES}
                selected={dishForm.category}
                onSelect={(value) => setDishForm((prev) => ({ ...prev, category: value }))}
              />

              <Text style={styles.inputLabel}>Dietary Flags</Text>
              <TextInput style={styles.input} placeholder="Example: vegetarian, gluten free" value={dishForm.dietary_flags} onChangeText={(value) => setDishForm((prev) => ({ ...prev, dietary_flags: value }))} />

              <View style={styles.twoColumnRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.inputLabel}>Price</Text>
                  <TextInput style={styles.input} placeholder="14.50" value={dishForm.price} onChangeText={(value) => setDishForm((prev) => ({ ...prev, price: value }))} keyboardType="decimal-pad" />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.inputLabel}>Availability</Text>
                  <ChoiceChips
                    options={["available", "unavailable"]}
                    selected={dishForm.availability}
                    onSelect={(value) => setDishForm((prev) => ({ ...prev, availability: value }))}
                  />
                </View>
              </View>

              <View style={styles.formButtonRow}>
                <View style={styles.formButtonHalf}><SecondaryButton title="Cancel" onPress={() => setDishForm(null)} /></View>
                <View style={styles.formButtonHalf}><PrimaryButton title="Save Dish" onPress={saveDishForm} /></View>
              </View>
            </View>
          ) : null}

          {dishes.map((dish) => (
            <View key={dish.id} style={styles.listRow}>
              <View style={styles.listIcon}><Text style={styles.listIconText}>☕</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{dish.name}</Text>
                <Text style={styles.secondaryText}>{dish.category} • {formatPrice(dish.price)} • {dish.availability}</Text>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={() => startEditDish(dish)}><Text>✎</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, styles.deleteIconButton]} onPress={() => deleteDish(dish.id)}><Text style={styles.deleteIconText}>🗑</Text></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.MANAGE_USERS) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <Header title="Manage Staff" leftTitle="Back" onLeft={() => setScreen(SCREENS.DASHBOARD)} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manage Staff</Text>
            <Text style={styles.secondaryText}>Add staff accounts, change roles and disable inactive users.</Text>
            <PrimaryButton title="Add New Staff" onPress={startAddStaff} />
          </View>

          {apiError ? <Text style={styles.warningBox}>{apiError}</Text> : null}

          {staffForm ? (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>{staffForm.mode === "edit" ? "Edit Staff" : "Add Staff"}</Text>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput style={styles.input} placeholder="Staff name" value={staffForm.name} onChangeText={(value) => setStaffForm((prev) => ({ ...prev, name: value }))} />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={styles.input} placeholder="staff@test.com" value={staffForm.email} onChangeText={(value) => setStaffForm((prev) => ({ ...prev, email: value }))} autoCapitalize="none" />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput style={styles.input} placeholder="123456" value={staffForm.password} onChangeText={(value) => setStaffForm((prev) => ({ ...prev, password: value }))} />

              <Text style={styles.inputLabel}>Role</Text>
              <ChoiceChips options={["staff", "manager"]} selected={staffForm.role} onSelect={(value) => setStaffForm((prev) => ({ ...prev, role: value }))} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Account Status</Text>
                  <Text style={styles.secondaryText}>{staffForm.active ? "Active staff member" : "Disabled account"}</Text>
                </View>
                <TouchableOpacity style={[styles.statusToggle, staffForm.active && styles.statusToggleActive]} onPress={() => setStaffForm((prev) => ({ ...prev, active: !prev.active }))}>
                  <Text style={[styles.statusToggleText, staffForm.active && styles.statusToggleTextActive]}>{staffForm.active ? "Active" : "Disabled"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formButtonRow}>
                <View style={styles.formButtonHalf}><SecondaryButton title="Cancel" onPress={() => setStaffForm(null)} /></View>
                <View style={styles.formButtonHalf}><PrimaryButton title="Save Staff" onPress={saveStaffForm} /></View>
              </View>
            </View>
          ) : null}

          {users.map((staff) => (
            <View key={staff.id} style={styles.listRow}>
              <View style={styles.listIcon}><Text style={styles.listIconText}>{staff.role === "manager" ? "★" : "👤"}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{staff.name || staff.email}</Text>
                <Text style={styles.secondaryText}>{staff.email} • {staff.role} • {staff.active ? "active" : "disabled"}</Text>
              </View>
              <Badge label={staff.role === "manager" ? "Manager" : "Staff"} type={staff.role === "manager" ? "manager" : "staff"} />
              <TouchableOpacity style={styles.iconButton} onPress={() => startEditStaff(staff)}><Text>✎</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, styles.deleteIconButton]} onPress={() => deleteStaff(staff.id)}><Text style={styles.deleteIconText}>🗑</Text></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === SCREENS.CATEGORIES) {
    return (
      <SafeAreaView style={styles.screenContainer}>
        <Header title="Manage Categories" leftTitle="Back" onLeft={() => setScreen(SCREENS.DASHBOARD)} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manage Categories</Text>
            <Text style={styles.secondaryText}>Add and edit the category buttons shown on the ordering screen.</Text>
            <PrimaryButton title="Add New Category" onPress={startAddCategory} />
          </View>

          {apiError ? <Text style={styles.warningBox}>{apiError}</Text> : null}

          {categoryForm ? (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>{categoryForm.mode === "edit" ? "Edit Category" : "Add Category"}</Text>
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput style={styles.input} placeholder="Example: Breakfast" value={categoryForm.name} onChangeText={(value) => setCategoryForm((prev) => ({ ...prev, name: value }))} />

              <View style={styles.formButtonRow}>
                <View style={styles.formButtonHalf}><SecondaryButton title="Cancel" onPress={() => setCategoryForm(null)} /></View>
                <View style={styles.formButtonHalf}><PrimaryButton title="Save Category" onPress={saveCategoryForm} /></View>
              </View>
            </View>
          ) : null}

          {categoryRecords.map((category) => (
            <View key={category.id} style={styles.listRow}>
              <View style={styles.listIcon}><Text style={styles.listIconText}>#</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{category.name}</Text>
                <Text style={styles.secondaryText}>Menu category</Text>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={() => startEditCategory(category)}><Text>✎</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, styles.deleteIconButton]} onPress={() => deleteCategory(category)}><Text style={styles.deleteIconText}>🗑</Text></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

/* ========================
   REUSABLE COMPONENTS
======================== */
const Header = ({ title, subtitle, leftTitle, onLeft, rightTitle, onRight }) => (
  <View style={styles.header}>
    {leftTitle ? (
      <TouchableOpacity onPress={onLeft} style={styles.headerSide}>
        <Text style={styles.headerLink}>{leftTitle}</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.headerSide} />
    )}

    <View style={styles.headerCenter}>
      <Image source={headerIcon} style={styles.headerLogo} resizeMode="contain" />
      <View style={{ alignItems: "center" }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>

    {rightTitle ? (
      <TouchableOpacity onPress={onRight} style={styles.headerSide}>
        <Text style={styles.headerLink}>{rightTitle}</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.headerSide} />
    )}
  </View>
);

const PrimaryButton = ({ title, onPress, disabled }) => (
  <TouchableOpacity style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]} onPress={onPress} disabled={disabled}>
    <Text style={styles.primaryButtonText}>{title}</Text>
  </TouchableOpacity>
);

const SecondaryButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.secondaryButton} onPress={onPress}>
    <Text style={styles.secondaryButtonText}>{title}</Text>
  </TouchableOpacity>
);

const MenuButton = ({ title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.menuButton} onPress={onPress}>
    <View style={{ flex: 1 }}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.secondaryText}>{subtitle}</Text>
    </View>
    <Text style={styles.menuArrow}>›</Text>
  </TouchableOpacity>
);

const KpiCard = ({ label, value, type }) => (
  <View style={[styles.kpiCard, type === "warning" && styles.kpiWarning, type === "success" && styles.kpiSuccess, type === "gold" && styles.kpiGold]}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
  </View>
);

const Badge = ({ label, type }) => {
  const badgeStyle =
    type === "completed" ? styles.badgeCompleted :
    type === "inProgress" ? styles.badgeInProgress :
    type === "manager" ? styles.badgeManager :
    styles.badgeStaff;

  const textStyle =
    type === "completed" ? styles.badgeCompletedText :
    type === "inProgress" ? styles.badgeInProgressText :
    type === "manager" ? styles.badgeManagerText :
    styles.badgeStaffText;

  return <View style={[styles.badge, badgeStyle]}><Text style={[styles.badgeText, textStyle]}>{label}</Text></View>;
};

const ChoiceChips = ({ options, selected, onSelect }) => (
  <View style={styles.choiceChipWrap}>
    {options.map((option) => (
      <TouchableOpacity
        key={option}
        style={[styles.choiceChip, selected === option && styles.choiceChipActive]}
        onPress={() => onSelect(option)}
      >
        <Text style={[styles.choiceChipText, selected === option && styles.choiceChipTextActive]}>{option}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const DishCard = ({ item, qty, onAdd, onRemove }) => (
  <View style={styles.dishCard}>
    <View style={styles.cardRowBetween}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
    </View>
    <Text style={styles.secondaryText}>{item.description}</Text>
    <View style={styles.badgeRow}>
      <Badge label={item.category} type="staff" />
      <Badge label={item.availability === "available" ? "Available" : "Unavailable"} type={item.availability === "available" ? "completed" : "inProgress"} />
    </View>
    <View style={styles.dishFooter}>
      <Text style={styles.secondaryText}>{item.dietary_flags}</Text>
      <View style={styles.qtyControls}>
        <TouchableOpacity style={styles.qtyMinus} onPress={onRemove}><Text style={styles.qtyText}>−</Text></TouchableOpacity>
        <Text style={styles.qtyNumber}>{qty}</Text>
        <TouchableOpacity style={[styles.qtyPlus, item.availability !== "available" && styles.qtyPlusDisabled]} onPress={onAdd} disabled={item.availability !== "available"}>
          <Text style={[styles.qtyText, { color: Colors.white }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

/* ========================
   STYLES
======================== */
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },

  loginScreen: {
    flex: 1,
    backgroundColor: Colors.darkBlue,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.base,
  },
  loginWrapper: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  logoBox: {
    width: 340,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  logo: {
    width: 330,
    height: 120,
  },
  loginSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  loginCard: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  demoPanel: {
    width: "100%",
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.card,
    backgroundColor: "rgba(255,255,255,0.10)",
    gap: Spacing.sm,
  },
  demoTitle: {
    color: Colors.white,
    fontWeight: "700",
  },
  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: Spacing.sm,
  },
  demoName: {
    color: Colors.white,
    fontWeight: "700",
  },
  demoEmail: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
  },

  header: {
    backgroundColor: Colors.darkBlue,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
  },
  headerLink: {
    color: Colors.gold,
    fontWeight: "700",
  },
  headerSide: {
    width: 76,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },

  screenTitle: {
    fontSize: 24,
    color: Colors.darkBlue,
    fontWeight: "300",
  },
  sectionTitle: {
    fontSize: 20,
    color: Colors.midBlue,
    fontWeight: "300",
  },
  cardTitle: {
    fontSize: 16,
    color: Colors.darkBlue,
    fontWeight: "700",
  },
  bodyText: {
    fontSize: 16,
    color: Colors.darkBlue,
    lineHeight: 24,
  },
  secondaryText: {
    fontSize: 13,
    color: Colors.midBlue,
    lineHeight: 20,
  },
  priceText: {
    fontSize: 15,
    color: Colors.darkBlue,
    fontWeight: "700",
  },

  inputLabel: {
    fontSize: 14,
    color: Colors.darkBlue,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.darkBlue,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  primaryButton: {
    backgroundColor: Colors.lightBlue,
    borderRadius: Radius.button,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.darkBlue,
    fontSize: 16,
    fontWeight: "700",
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },

  menuButton: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    padding: Spacing.base,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  menuArrow: {
    fontSize: 28,
    color: Colors.lightBlue,
  },

  kpiRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: 110,
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    padding: Spacing.md,
  },
  kpiWarning: { backgroundColor: Colors.inProgressBg },
  kpiSuccess: { backgroundColor: Colors.completedBg },
  kpiGold: { backgroundColor: Colors.paleGold },
  kpiLabel: {
    color: Colors.midBlue,
    fontSize: 11,
    fontWeight: "700",
  },
  kpiValue: {
    color: Colors.darkBlue,
    fontSize: 28,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },

  orderFloatingScreen: {
    flex: 1,
    position: "relative",
  },
  orderPageScroll: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  orderLayout: {
    padding: Spacing.base,
    paddingBottom: 380,
    gap: Spacing.md,
  },
  orderLayoutWithExpandedSummary: {
    paddingBottom: 520,
  },
  orderLayoutWithCollapsedSummary: {
    paddingBottom: 120,
  },
  orderLayoutWide: {
    paddingRight: 420,
  },
  menuPanel: {
    width: "100%",
  },
  menuList: {
    paddingBottom: Spacing.sm,
  },
  floatingOrderPanel: {
    position: "absolute",
    left: Spacing.base,
    right: Spacing.base,
    bottom: Spacing.base,
    maxHeight: 460,
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: Spacing.md,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  floatingOrderPanelWide: {
    position: "absolute",
    right: Spacing.base,
    top: Spacing.base,
    bottom: Spacing.base,
    width: 380,
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: Spacing.md,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  floatingOrderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  floatingOrderToggle: {
    color: Colors.lightBlue,
    fontWeight: "700",
  },
  floatingOrderBody: {
    maxHeight: 390,
  },
  floatingOrderBodyContent: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  orderMiniSummary: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  orderMiniRight: {
    alignItems: "flex-end",
  },
  totalTextSmall: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.darkBlue,
  },
  viewSummaryText: {
    color: Colors.lightBlue,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  categoryScroll: {
    marginVertical: Spacing.md,
    maxHeight: 48,
    flexGrow: 0,
  },
  categoryScrollContent: {
    alignItems: "center",
    paddingRight: Spacing.base,
  },
  categoryChip: {
    height: 40,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    marginRight: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  categoryChipActive: {
    backgroundColor: Colors.lightBlue,
    borderColor: Colors.lightBlue,
  },
  categoryChipText: {
    color: Colors.darkBlue,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  dishCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  dishFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGrey,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  qtyMinus: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.paleGold,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyPlus: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyPlusDisabled: {
    backgroundColor: "#9CA3AF",
  },
  qtyText: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.darkBlue,
  },
  qtyNumber: {
    minWidth: 20,
    textAlign: "center",
    fontWeight: "700",
    color: Colors.darkBlue,
  },
  orderSummary: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  tableScroll: {
    marginBottom: Spacing.xs,
    maxHeight: 46,
    flexGrow: 0,
  },
  tableScrollContent: {
    alignItems: "center",
  },
  tableChip: {
    height: 38,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    paddingHorizontal: Spacing.md,
    minWidth: 112,
    marginRight: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  tableChipActive: {
    backgroundColor: Colors.paleGold,
    borderColor: Colors.gold,
  },
  tableChipText: {
    color: Colors.darkBlue,
    fontWeight: "600",
  },
  tableChipTextActive: {
    color: Colors.darkBlue,
  },
  cartItems: {
    gap: Spacing.xs,
    minHeight: 40,
  },
  cartRow: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.lightGrey,
    paddingTop: Spacing.sm,
  },
  totalText: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.darkBlue,
  },
  successBox: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    color: Colors.successText,
    fontWeight: "700",
  },
  infoBox: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    color: Colors.successText,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  warningBox: {
    backgroundColor: Colors.inProgressBg,
    borderColor: Colors.gold,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    color: Colors.inProgressText,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  refreshButton: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.paleGold,
    marginTop: Spacing.sm,
  },
  refreshButtonText: {
    color: Colors.darkBlue,
    fontWeight: "700",
    fontSize: 12,
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeInProgress: { backgroundColor: Colors.inProgressBg },
  badgeInProgressText: { color: Colors.inProgressText },
  badgeCompleted: { backgroundColor: Colors.completedBg },
  badgeCompletedText: { color: Colors.completedText },
  badgeManager: { backgroundColor: Colors.gold },
  badgeManagerText: { color: Colors.darkBlue },
  badgeStaff: { backgroundColor: Colors.paleGold },
  badgeStaffText: { color: Colors.darkBlue },

  listRow: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    padding: Spacing.base,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.paleGold,
    alignItems: "center",
    justifyContent: "center",
  },
  listIconText: {
    fontSize: 18,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.inputBg,
  },
  deleteIconButton: {
    backgroundColor: Colors.unavailableBg,
  },
  deleteIconText: {
    color: Colors.destructive,
  },
  reportRow: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  reportBar: {
    height: 10,
    backgroundColor: Colors.lightBlue,
    borderRadius: Radius.pill,
  },
  choiceChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  choiceChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
  },
  choiceChipActive: {
    backgroundColor: Colors.lightBlue,
    borderColor: Colors.lightBlue,
  },
  choiceChipText: {
    color: Colors.darkBlue,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  choiceChipTextActive: {
    color: Colors.white,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  fieldHalf: {
    flex: 1,
  },
  formButtonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  formButtonHalf: {
    flex: 1,
  },
  switchRow: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.input,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  statusToggle: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.lightGrey,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.unavailableBg,
  },
  statusToggleActive: {
    backgroundColor: Colors.completedBg,
    borderColor: Colors.successBorder,
  },
  statusToggleText: {
    color: Colors.unavailableText,
    fontWeight: "700",
  },
  statusToggleTextActive: {
    color: Colors.completedText,
  },
});
