"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactivateResource = exports.deactivateResource = exports.getResourcesByDepartment = exports.getResourcesByType = exports.deleteResource = exports.updateResource = exports.createResource = exports.getResourceById = exports.getResources = void 0;
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../config/firebase");
var getResources = function () {
    var args_1 = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args_1[_i] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (activeOnly) {
        var resourcesRef, queryConstraints, resourcesQuery, snapshot, error_1;
        if (activeOnly === void 0) { activeOnly = true; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    resourcesRef = (0, firestore_1.collection)(firebase_1.db, "resources");
                    queryConstraints = [];
                    if (activeOnly) {
                        queryConstraints.push((0, firestore_1.where)("active", "==", true));
                    }
                    queryConstraints.push((0, firestore_1.orderBy)("name", "asc"));
                    resourcesQuery = firestore_1.query.apply(void 0, __spreadArray([resourcesRef], queryConstraints, false));
                    return [4 /*yield*/, (0, firestore_1.getDocs)(resourcesQuery)];
                case 1:
                    snapshot = _a.sent();
                    return [2 /*return*/, snapshot.docs.map(function (doc) {
                            return (__assign({ id: doc.id }, doc.data()));
                        })];
                case 2:
                    error_1 = _a.sent();
                    console.error("Error fetching resources:", error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
};
exports.getResources = getResources;
var getResourceById = function (resourceId) { return __awaiter(void 0, void 0, void 0, function () {
    var resourceRef, resourceDoc, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                resourceRef = (0, firestore_1.doc)(firebase_1.db, "resources", resourceId);
                return [4 /*yield*/, (0, firestore_1.getDoc)(resourceRef)];
            case 1:
                resourceDoc = _a.sent();
                if (!resourceDoc.exists()) {
                    return [2 /*return*/, null];
                }
                return [2 /*return*/, __assign({ id: resourceDoc.id }, resourceDoc.data())];
            case 2:
                error_2 = _a.sent();
                console.error("Error fetching resource with ID ".concat(resourceId, ":"), error_2);
                throw error_2;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getResourceById = getResourceById;
var createResource = function (resource) { return __awaiter(void 0, void 0, void 0, function () {
    var resourceData, docRef, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                resourceData = __assign(__assign({}, resource), { createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
                return [4 /*yield*/, (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, "resources"), resourceData)];
            case 1:
                docRef = _a.sent();
                return [2 /*return*/, __assign({ id: docRef.id }, resourceData)];
            case 2:
                error_3 = _a.sent();
                console.error("Error creating resource:", error_3);
                throw error_3;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.createResource = createResource;
var updateResource = function (resourceId, updates) { return __awaiter(void 0, void 0, void 0, function () {
    var resourceRef, updatedData, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                resourceRef = (0, firestore_1.doc)(firebase_1.db, "resources", resourceId);
                updatedData = __assign(__assign({}, updates), { updatedAt: firestore_1.Timestamp.now() });
                return [4 /*yield*/, (0, firestore_1.updateDoc)(resourceRef, updatedData)];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error("Error updating resource with ID ".concat(resourceId, ":"), error_4);
                throw error_4;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.updateResource = updateResource;
var deleteResource = function (resourceId) { return __awaiter(void 0, void 0, void 0, function () {
    var resourceRef, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                resourceRef = (0, firestore_1.doc)(firebase_1.db, "resources", resourceId);
                return [4 /*yield*/, (0, firestore_1.deleteDoc)(resourceRef)];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error("Error deleting resource with ID ".concat(resourceId, ":"), error_5);
                throw error_5;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.deleteResource = deleteResource;
var getResourcesByType = function (type) { return __awaiter(void 0, void 0, void 0, function () {
    var resourcesRef, resourcesQuery, snapshot, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                resourcesRef = (0, firestore_1.collection)(firebase_1.db, "resources");
                resourcesQuery = (0, firestore_1.query)(resourcesRef, (0, firestore_1.where)("type", "==", type), (0, firestore_1.where)("active", "==", true), (0, firestore_1.orderBy)("name", "asc"));
                return [4 /*yield*/, (0, firestore_1.getDocs)(resourcesQuery)];
            case 1:
                snapshot = _a.sent();
                return [2 /*return*/, snapshot.docs.map(function (doc) {
                        return (__assign({ id: doc.id }, doc.data()));
                    })];
            case 2:
                error_6 = _a.sent();
                console.error("Error fetching resources of type ".concat(type, ":"), error_6);
                throw error_6;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getResourcesByType = getResourcesByType;
var getResourcesByDepartment = function (department) { return __awaiter(void 0, void 0, void 0, function () {
    var resourcesRef, resourcesQuery, snapshot, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                resourcesRef = (0, firestore_1.collection)(firebase_1.db, "resources");
                resourcesQuery = (0, firestore_1.query)(resourcesRef, (0, firestore_1.where)("department", "==", department), (0, firestore_1.where)("active", "==", true), (0, firestore_1.orderBy)("name", "asc"));
                return [4 /*yield*/, (0, firestore_1.getDocs)(resourcesQuery)];
            case 1:
                snapshot = _a.sent();
                return [2 /*return*/, snapshot.docs.map(function (doc) {
                        return (__assign({ id: doc.id }, doc.data()));
                    })];
            case 2:
                error_7 = _a.sent();
                console.error("Error fetching resources in department ".concat(department, ":"), error_7);
                throw error_7;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.getResourcesByDepartment = getResourcesByDepartment;
var deactivateResource = function (resourceId) { return __awaiter(void 0, void 0, void 0, function () {
    var resourceRef, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                resourceRef = (0, firestore_1.doc)(firebase_1.db, "resources", resourceId);
                return [4 /*yield*/, (0, firestore_1.updateDoc)(resourceRef, {
                        active: false,
                        updatedAt: firestore_1.Timestamp.now(),
                    })];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.error("Error deactivating resource with ID ".concat(resourceId, ":"), error_8);
                throw error_8;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.deactivateResource = deactivateResource;
var reactivateResource = function (resourceId) { return __awaiter(void 0, void 0, void 0, function () {
    var resourceRef, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                resourceRef = (0, firestore_1.doc)(firebase_1.db, "resources", resourceId);
                return [4 /*yield*/, (0, firestore_1.updateDoc)(resourceRef, {
                        active: true,
                        updatedAt: firestore_1.Timestamp.now(),
                    })];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                console.error("Error reactivating resource with ID ".concat(resourceId, ":"), error_9);
                throw error_9;
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.reactivateResource = reactivateResource;
