"use strict";
// ============================================
// SHARED TYPES FOR THE ENTIRE POS SYSTEM
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.WSEventType = exports.StationType = exports.DiscountType = exports.TaxType = exports.ServiceMode = exports.DayPart = exports.ModifierType = exports.MenuItemStatus = exports.TableStatus = exports.KDSItemStatus = exports.PaymentStatus = exports.PaymentMethod = exports.OrderType = exports.OrderStatus = exports.UserRole = void 0;
// ---- Enums ----
var UserRole;
(function (UserRole) {
    UserRole["OWNER"] = "OWNER";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["SERVER"] = "SERVER";
    UserRole["BARTENDER"] = "BARTENDER";
    UserRole["CASHIER"] = "CASHIER";
    UserRole["EXPO"] = "EXPO";
    UserRole["KDS"] = "KDS";
})(UserRole || (exports.UserRole = UserRole = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["DRAFT"] = "DRAFT";
    OrderStatus["OPEN"] = "OPEN";
    OrderStatus["SENT"] = "SENT";
    OrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    OrderStatus["READY"] = "READY";
    OrderStatus["SERVED"] = "SERVED";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["VOID"] = "VOID";
    OrderStatus["REFUNDED"] = "REFUNDED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var OrderType;
(function (OrderType) {
    OrderType["DINE_IN"] = "DINE_IN";
    OrderType["TAKEOUT"] = "TAKEOUT";
    OrderType["DELIVERY"] = "DELIVERY";
    OrderType["BAR"] = "BAR";
})(OrderType || (exports.OrderType = OrderType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CREDIT_CARD"] = "CREDIT_CARD";
    PaymentMethod["DEBIT_CARD"] = "DEBIT_CARD";
    PaymentMethod["GIFT_CARD"] = "GIFT_CARD";
    PaymentMethod["SPLIT"] = "SPLIT";
    PaymentMethod["COMP"] = "COMP";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["AUTHORIZED"] = "AUTHORIZED";
    PaymentStatus["CAPTURED"] = "CAPTURED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["VOIDED"] = "VOIDED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var KDSItemStatus;
(function (KDSItemStatus) {
    KDSItemStatus["PENDING"] = "PENDING";
    KDSItemStatus["IN_PROGRESS"] = "IN_PROGRESS";
    KDSItemStatus["READY"] = "READY";
    KDSItemStatus["SERVED"] = "SERVED";
    KDSItemStatus["VOIDED"] = "VOIDED";
})(KDSItemStatus || (exports.KDSItemStatus = KDSItemStatus = {}));
var TableStatus;
(function (TableStatus) {
    TableStatus["AVAILABLE"] = "AVAILABLE";
    TableStatus["OCCUPIED"] = "OCCUPIED";
    TableStatus["RESERVED"] = "RESERVED";
    TableStatus["DIRTY"] = "DIRTY";
    TableStatus["BLOCKED"] = "BLOCKED";
})(TableStatus || (exports.TableStatus = TableStatus = {}));
var MenuItemStatus;
(function (MenuItemStatus) {
    MenuItemStatus["ACTIVE"] = "ACTIVE";
    MenuItemStatus["INACTIVE"] = "INACTIVE";
    MenuItemStatus["OUT_OF_STOCK"] = "OUT_OF_STOCK";
})(MenuItemStatus || (exports.MenuItemStatus = MenuItemStatus = {}));
var ModifierType;
(function (ModifierType) {
    ModifierType["SINGLE"] = "SINGLE";
    ModifierType["MULTIPLE"] = "MULTIPLE";
})(ModifierType || (exports.ModifierType = ModifierType = {}));
var DayPart;
(function (DayPart) {
    DayPart["BREAKFAST"] = "BREAKFAST";
    DayPart["LUNCH"] = "LUNCH";
    DayPart["DINNER"] = "DINNER";
    DayPart["LATE_NIGHT"] = "LATE_NIGHT";
    DayPart["ALL_DAY"] = "ALL_DAY";
})(DayPart || (exports.DayPart = DayPart = {}));
var ServiceMode;
(function (ServiceMode) {
    ServiceMode["FULL_SERVICE"] = "FULL_SERVICE";
    ServiceMode["QUICK_SERVICE"] = "QUICK_SERVICE";
    ServiceMode["BAR"] = "BAR";
    ServiceMode["FOOD_TRUCK"] = "FOOD_TRUCK";
})(ServiceMode || (exports.ServiceMode = ServiceMode = {}));
var TaxType;
(function (TaxType) {
    TaxType["PERCENTAGE"] = "PERCENTAGE";
    TaxType["FLAT"] = "FLAT";
})(TaxType || (exports.TaxType = TaxType = {}));
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "PERCENTAGE";
    DiscountType["FLAT"] = "FLAT";
    DiscountType["COMP"] = "COMP";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
var StationType;
(function (StationType) {
    StationType["KITCHEN"] = "KITCHEN";
    StationType["BAR"] = "BAR";
    StationType["EXPO"] = "EXPO";
    StationType["GRILL"] = "GRILL";
    StationType["FRY"] = "FRY";
    StationType["DESSERT"] = "DESSERT";
    StationType["CUSTOM"] = "CUSTOM";
})(StationType || (exports.StationType = StationType = {}));
var WSEventType;
(function (WSEventType) {
    WSEventType["ORDER_CREATED"] = "ORDER_CREATED";
    WSEventType["ORDER_UPDATED"] = "ORDER_UPDATED";
    WSEventType["ORDER_FIRED"] = "ORDER_FIRED";
    WSEventType["ORDER_PAID"] = "ORDER_PAID";
    WSEventType["ORDER_VOIDED"] = "ORDER_VOIDED";
    WSEventType["ITEM_STATUS_CHANGED"] = "ITEM_STATUS_CHANGED";
    WSEventType["TABLE_STATUS_CHANGED"] = "TABLE_STATUS_CHANGED";
    WSEventType["MENU_UPDATED"] = "MENU_UPDATED";
    WSEventType["ITEM_86"] = "ITEM_86";
    WSEventType["KDS_BUMP"] = "KDS_BUMP";
    WSEventType["KDS_RECALL"] = "KDS_RECALL";
    WSEventType["KDS_RUSH"] = "KDS_RUSH";
    WSEventType["PAYMENT_CAPTURED"] = "PAYMENT_CAPTURED";
    WSEventType["STAFF_CLOCKED_IN"] = "STAFF_CLOCKED_IN";
    WSEventType["STAFF_CLOCKED_OUT"] = "STAFF_CLOCKED_OUT";
    WSEventType["TABLE_UPDATED"] = "TABLE_UPDATED";
})(WSEventType || (exports.WSEventType = WSEventType = {}));
//# sourceMappingURL=index.js.map