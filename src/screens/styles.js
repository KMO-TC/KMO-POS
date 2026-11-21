// styles.js
import {
  StyleSheet,
} from 'react-native';
import {
  Platform,
} from 'react-native';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#4a5054ff" },

  container: { flex: 1, padding: 15, backgroundColor: "#ffffff" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Data တွေ အပေါ်မှာ စုထားဖို့
    marginBottom: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },

  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },

  limitText: {
    // 💡 Limit Text အတွက် Style အသစ်
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  statusText: {
    // marginTop: 10,
    padding: 5,
    fontSize: 16,
    color: "#0a0a0aff",
    textAlign: "center",
  },

  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d9534f",
    marginBottom: 8,
    textAlign: "center",
  },
  errorDetails: {
    color: "#a94442",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  footerText: {
    textAlign: "center",
    color: "#bdc3c7",
    fontSize: 11,
    marginTop: 25,
  },

  listContent: { paddingBottom: 20 },

  ///////////////////////////////////////Dashboard ////////////////////
  // ... ကျန်ရှိသော Card Styles များ
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    // alignContent: "center",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    borderBottomWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
    width: "48%",
    marginBottom: 15,
  },

  icon: {
    fontSize: 35,
    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
  },

  ////////////////////////// for router list//////////////////////////////

  offlineBanner: {
    backgroundColor: "#ffc107",
    padding: 8,
    alignItems: "center",
    marginBottom: 10,
    borderRadius: 5,
  },

  offlineText: { color: "#333", fontWeight: "bold", fontSize: 13 },

  addButtonDisabled: { backgroundColor: "#999" },

  routerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1ad86dff",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
  },

  routerInfo: { flex: 1 },
  routerName: { fontSize: 16, fontWeight: "600", color: "#333" },
  routerIP: { fontSize: 13, color: "#666", marginTop: 3 },
  statusBadge: {
    paddingHorizontal: 10,
    // paddingVertical: 2,
    borderRadius: 10,
    justifyContent: "center",
    textAlign: "center",
    alignItems: "center",
    alignContent: "center",
    fontSize: 24,
    color: "#710404ff",
  },

  ////////////////////////// Add router ////////////////

  label: {
    fontSize: 14,
    color: "#555",
    marginTop: 8,
    marginBottom: 3,
    marginLeft: 3,
  },

  SaveButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 30,
  },

  testButton: {
    minHeight: 50,
    justifyContent: "center",
  },

  //////////////////////////////////router detail  /////////////////

  RDloadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: { fontSize: 14, color: "#6c757d", marginBottom: 20 },

  detailCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: "#007bff",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    marginBottom: 3,
  },
  detailValue: { fontSize: 18, color: "#333", fontWeight: "bold" },

  editButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  editButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  RDdeleteButton: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  deleteButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  ///////////////////////////router edit /////////////////

  REloadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  note: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 20,
    fontStyle: "italic",
  },
  saveButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  //////////////////////  pool list  ///////////////////////

  // ---------------- Stylesheet ----------------

  addButton: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
    alignItems: "center",
  },

  addButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 20,
    lineHeight: 20,
    paddingBottom: 2,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  }, // 💡 FIX: Scroll Padding ကို တိုးမြှင့်ခြင်း

  //   listContent: { paddingHorizontal: 15, paddingBottom: 60, paddingTop: 5 }, // Padding 60 ပေးထားသည်။ // Pool Item Styles (Profile Screen ပုံစံတူ)

  poolItem: {
    backgroundColor: "#ffffff",
    padding: 20,
    marginVertical: 5, // Item တွေကြား ၅
    borderRadius: 8,
    borderLeftWidth: 5,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    position: "relative",
  },
  poolName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  poolRange: { fontSize: 15, color: "#555", marginTop: 4 },
  poolComment: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    marginTop: 4,
  },
  // Router Tag Container (ညာဘက်အလယ်ဗဟိုမှာ ညီအောင် ချိန်သည်)
  routerTagContainer: {
    position: "absolute",
    right: 15,
    top: "50%", // အလယ်
    transform: [{ translateY: -15 }], // မိမိရဲ့ တဝက်ကို ပြန်ဆွဲ
    backgroundColor: "#007aff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    zIndex: 5,
    height: 30, // ညီစေရန် ခန့်မှန်းခြေ Height ပေးထားသည်
    justifyContent: "center",
    alignItems: "center",
  },
  routerTagText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },

  // Warning Item Styles
  warningItem: {
    borderLeftColor: "#d9534f", // Red Border
    backgroundColor: "#f8d7da", // Light red background
    paddingRight: 80, // Tag နေရာလွတ် ချန်ရန်
  },
  warningRouterText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#d9534f",
    marginBottom: 5,
  },
  warningMessageText: {
    fontSize: 14,
    color: "#a94442",
  }, // Error & Status Text

  reloadButton: {
    backgroundColor: "#ffc107",
    padding: 10,
    borderRadius: 5,
    marginTop: 15,
  },
  reloadButtonText: { color: "#333", fontWeight: "bold" },

  //////////////////////////////////////  Profile  ////////////////////////
  // ---------------- Stylesheet ----------------
  profileItem: {
    backgroundColor: "#ffffff",
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 8,
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: "#17a2b8",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  profileLimit: { fontSize: 15, color: "#5cb85c", fontWeight: "600" },
  profileStatus: { fontSize: 15, color: "#ffc107", marginTop: 4 },
  routerTag: {
    fontSize: 15,
    color: "#17a2b8",
    marginTop: 4,
    fontWeight: "bold",
  },
  profileOther: { fontSize: 15, color: "#b1eb04ff", marginTop: 4 },

  ////////////////////////////////Profile edit/////////////////

  // ---------------- Stylesheet ----------------

  routerTag: {
    fontSize: 14,
    color: "#17a2b8",
    marginBottom: 20,
    fontWeight: "600",
  },
  detailsBox: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  errorMessage: {
    color: "#dc3545",
    textAlign: "center",
    marginVertical: 15,
    fontWeight: "bold",
    paddingHorizontal: 10,
  },

  PPformGroup: { paddingVertical: 2 },
  detailLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#6c757d",
    marginBottom: 5,
  },

  pickerHelperText: { fontSize: 11, color: "#6c757d", marginTop: 5 },

  mikrotikIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f8f9fa",
    marginTop: 10,
  },
  mikrotikIdValue: { fontSize: 15, color: "#6c757d", fontWeight: "600" },

  cancelButton: {
    backgroundColor: "#6c757d",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },

  PPdeleteButton: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  deleteButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },

  ////////////////////////////////////////profile Add//////////////////////

  scrollContent: {
    padding: 10,
  },

  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#343a40",
    marginBottom: 20,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 8,
  },

  required: {
    color: "red",
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#343a40",
    minHeight: 45,
  },
  pickerContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    minHeight: 45,
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 45,
      },
      android: {
        color: "#343a40",
      },
    }),
  },
  loadingPoolsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e9ecef",
    padding: 10,
    borderRadius: 8,
    minHeight: 45,
    borderWidth: 1, // Warning message အတွက် border ထည့်
    borderColor: "#ced4da",
  },
  submitButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#6c757d",
    opacity: 0.7, // ပိုမို သိသာစေရန်
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  submitError: {
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 10,
  },

  /////////////////////////////User List /////

  StatusCardContainer: {
    flexDirection: "row",
    padding: 10,
    // backgroundColor: "#fff",
    marginTop: -15,
    // borderBottomColor: "#437346",
  },

  StatusCard: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    margin: 2,
    borderRadius: 8,
    backgroundColor: "#ffffffff",
    elevation: 1,
    minHeight: 60,
    justifyContent: "center",
  },

  cardValue: { fontSize: 16, fontWeight: "bold" },

  cardLabel: { fontSize: 10, color: "#666", marginTop: 2 },

  searchInput: {
    backgroundColor: "#fff",
    margin: 10,
    marginTop: 0,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonGroup: { flexDirection: "row", paddingHorizontal: 10, marginBottom: 5 },
  addBtn: {
    backgroundColor: "#007aff",
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  bulkBtn: {
    backgroundColor: "#ffc107",
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  userItem: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    marginVertical: 4,
    marginHorizontal: 10,
    borderRadius: 8,
    borderLeftWidth: 5,
    elevation: 2,
    alignItems: "center",
  },
  userTextContainer: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "bold" },
  subText: { fontSize: 12, color: "#666", marginTop: 2 },
  routerTag: {
    fontSize: 11,
    color: "#17a2b8",
    fontWeight: "bold",
    marginTop: 4,
  },

  /////////////////////  User Add /////////////////////////////

  disabledButton: {
    backgroundColor: "#adb5bd",
    opacity: 0.6,
  },

  ///////////////////user edit ///////////////////////

  readOnlyInput: {
    backgroundColor: "#e9ecef",
    color: "#6c757d",
  },
  pickerContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ced4da",
    marginBottom: 5,
    height: Platform.OS === "ios" ? 50 : 50,
    justifyContent: "center",
    overflow: "hidden",
  },
  pickerStyle: {
    width: "100%",
    height: Platform.OS === "ios" ? 50 : 50,
    color: "black",
  },
  loadingContainer: {
    flexDirection: "row", // Indicator နဲ့ Text ကို ဘေးချင်းကပ်ထားရန်
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    paddingHorizontal: 15,
  },
  loadingText: {
    marginLeft: 10,
    color: "#6c757d",
  },
  statusBox: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  statusActive: {
    backgroundColor: "#d4edda",
    borderColor: "#c3e6cb",
    borderWidth: 1,
  },
  statusBlocked: {
    backgroundColor: "#f8d7da",
    borderColor: "#f5c6cb",
    borderWidth: 1,
  },
  statusTextTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#4c84bcff",
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
    marginTop: 15,
  },
  actionButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  resetButton: {
    backgroundColor: "#17a2b8", // Info/Cyan Color
  },
  blockButton: {
    backgroundColor: "#ffc107", // Warning
  },
  unblockButton: {
    backgroundColor: "#28a745", // Success
  },
  deleteButton: {
    backgroundColor: "#dc3545", // Danger
  },

  ///////////////////////////////////////  voucher  bulk   10+  ///////////////////

  Vcheader: {
    padding: 18,
    // backgroundColor: "#fff",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  subTitle: { fontSize: 13, color: "#666", marginTop: 4 },
  progressCard: {
    margin: 15,
    padding: 15,
    backgroundColor: "#FFF9C4",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FBC02D",
  },
  progressText: { fontWeight: "bold", fontSize: 16, color: "#E65100" },
  VcGroup: { marginHorizontal: 15, marginTop: 15 },
  // label: { marginBottom: 10, fontWeight: "bold", color: "#555" },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    overflow: "hidden",
  },
  // picker: { height: 55, width: "100%" },
  listSection: { flex: 1, marginHorizontal: 15, marginTop: 15 },
  userCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  userInfo: { flex: 1 },
  userText: { fontSize: 15, fontWeight: "bold", color: "#333" },
  passText: { fontSize: 14, color: "#666", marginTop: 2 },
  profileTag: {
    fontSize: 12,
    backgroundColor: "#E3F2FD",
    color: "#2196F3",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  refreshBtn: {
    flex: 1,
    backgroundColor: "#6C757D",
    padding: 16,
    borderRadius: 10,
    marginRight: 8,
    alignItems: "center",
  },
  printBtn: {
    flex: 2,
    backgroundColor: "#E91E63",
    padding: 16,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: "center",
  },
  disabledBtn: { backgroundColor: "#CCC" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  ////////////////////////////////////////////   voucher single ///////////////////

  summaryCard: {
    margin: 10,
    padding: 18,
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    borderLeftWidth: 6,
    borderLeftColor: "#2196F3",
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#2196F3",
    fontWeight: "bold",
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 3,
    color: "#1A2138",
    fontWeight: "600",
  },
});
