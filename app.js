const STORAGE_KEYS = {
  products: "wearnwalk_products",
  sales: "wearnwalk_sales",
  billCounter: "wearnwalk_bill_counter",
  shopProfile: "wearnwalk_shop_profile",
};

const productForm = document.getElementById("product-form");
const productIdInput = document.getElementById("product-id");
const productNameInput = document.getElementById("product-name");
const productSkuInput = document.getElementById("product-sku");
const productCategoryInput = document.getElementById("product-category");
const productStockInput = document.getElementById("product-stock");
const productPriceInput = document.getElementById("product-price");
const productSizeInput = document.getElementById("product-size");
const clearFormBtn = document.getElementById("clear-form");
const searchInput = document.getElementById("search-input");
const inventoryBody = document.querySelector("#inventory-table tbody");

const saleForm = document.getElementById("sale-form");
const customerNameInput = document.getElementById("customer-name");
const customerPhoneInput = document.getElementById("customer-phone");
const saleItemsContainer = document.getElementById("sale-items");
const addSaleItemBtn = document.getElementById("add-sale-item");
const paymentMethodInput = document.getElementById("payment-method");
const salesBody = document.querySelector("#sales-table tbody");
const billTemplate = document.getElementById("bill-template");
const shopForm = document.getElementById("shop-form");
const shopTitle = document.getElementById("shop-title");
const shopTagline = document.getElementById("shop-tagline");
const shopMeta = document.getElementById("shop-meta");
const shopNameInput = document.getElementById("shop-name");
const shopOwnerInput = document.getElementById("shop-owner");
const shopPhoneInput = document.getElementById("shop-phone");
const shopAddressInput = document.getElementById("shop-address");
const shopTaglineInput = document.getElementById("shop-tagline-input");
const shopAdminPinInput = document.getElementById("shop-admin-pin");
const adminOnlySections = document.querySelectorAll(".admin-only");
const guestOnlySections = document.querySelectorAll(".guest-only");
const adminPanelLogin = document.getElementById("admin-panel-login");
const adminLoginForm = document.getElementById("admin-login-form");
const adminPinInput = document.getElementById("admin-pin-input");
const openGuestPanelBtn = document.getElementById("open-guest-panel");
const openAdminPanelBtn = document.getElementById("open-admin-panel");
const activeRoleLabel = document.getElementById("active-role-label");

let products = getStored(STORAGE_KEYS.products, []);
let sales = getStored(STORAGE_KEYS.sales, []);
let billCounter = getStored(STORAGE_KEYS.billCounter, 1);
let shopProfile = getStored(STORAGE_KEYS.shopProfile, {
  name: "WEARNWALK",
  owner: "",
  phone: "",
  address: "",
  tagline: "Style. Comfort. Everyday.",
  adminPin: "1234",
});
let activeRole = "guest";

async function importSeedProducts() {
  try {
    let seedProducts = Array.isArray(window.SEED_PRODUCTS) ? window.SEED_PRODUCTS : [];
    if (!seedProducts.length) {
      const response = await fetch("seed-products.json", { cache: "no-store" });
      if (!response.ok) return;
      seedProducts = await response.json();
    }
    if (!Array.isArray(seedProducts) || !seedProducts.length) return;

    const productBySku = new Map(products.map((p) => [p.sku, p]));
    let changed = false;

    seedProducts.forEach((seed) => {
      if (!seed?.sku) return;
      const exists = productBySku.get(seed.sku);
      if (!exists) {
        const initialStock = Number(seed.stock) || 0;
        products.push({
          id: seed.id || crypto.randomUUID(),
          name: seed.name || "Product",
          sku: seed.sku,
          category: seed.category || "Footwear",
          size: seed.size || "",
          stock: initialStock,
          sizeStock: buildSizeStock(seed.size || "", initialStock),
          price: Number(seed.price) || 0,
        });
        changed = true;
      }
    });

    if (changed) {
      setStored(STORAGE_KEYS.products, products);
    }
  } catch (error) {
    // Keep app usable even if seed file cannot be loaded.
  }
}

function getStored(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function setStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatMoney(value) {
  return Number(value).toFixed(2);
}

function parseSizes(sizeText) {
  return String(sizeText || "")
    .split(",")
    .map((size) => size.trim())
    .filter(Boolean);
}

function sumSizeStock(sizeStock) {
  return Object.values(sizeStock || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
}

function getProductTotalStock(product) {
  const hasSizeStock = product && product.sizeStock && Object.keys(product.sizeStock).length > 0;
  if (hasSizeStock) return sumSizeStock(product.sizeStock);
  return Number(product?.stock) || 0;
}

function buildSizeStock(sizeText, totalStock, currentSizeStock = {}) {
  const sizes = parseSizes(sizeText);
  if (!sizes.length) return {};

  const existingKeys = Object.keys(currentSizeStock || {});
  const normalizedTotal = Math.max(0, Number(totalStock) || 0);

  if (
    existingKeys.length === sizes.length &&
    existingKeys.every((key, idx) => key === sizes[idx])
  ) {
    const adjusted = { ...currentSizeStock };
    const diff = normalizedTotal - sumSizeStock(adjusted);
    if (diff !== 0) {
      adjusted[sizes[0]] = Math.max(0, (Number(adjusted[sizes[0]]) || 0) + diff);
    }
    return adjusted;
  }

  const base = Math.floor(normalizedTotal / sizes.length);
  let remainder = normalizedTotal % sizes.length;
  const distributed = {};
  sizes.forEach((size) => {
    distributed[size] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  });
  return distributed;
}

function formatSizeStock(sizeStock) {
  const entries = Object.entries(sizeStock || {});
  if (!entries.length) return "-";
  return entries.map(([size, qty]) => `${size}:${qty}`).join(", ");
}

function normalizeProductsData() {
  let changed = false;
  products = products.map((product) => {
    const totalStock = getProductTotalStock(product);
    const sizeStock = buildSizeStock(product.size, totalStock, product.sizeStock || {});
    const normalized = {
      ...product,
      stock: totalStock,
      sizeStock,
    };

    if (
      normalized.stock !== product.stock ||
      JSON.stringify(normalized.sizeStock) !== JSON.stringify(product.sizeStock || {})
    ) {
      changed = true;
    }
    return normalized;
  });

  if (changed) {
    setStored(STORAGE_KEYS.products, products);
  }
}

function fillShopForm() {
  shopNameInput.value = shopProfile.name || "WEARNWALK";
  shopOwnerInput.value = shopProfile.owner || "";
  shopPhoneInput.value = shopProfile.phone || "";
  shopAddressInput.value = shopProfile.address || "";
  shopTaglineInput.value = shopProfile.tagline || "Style. Comfort. Everyday.";
  shopAdminPinInput.value = shopProfile.adminPin || "1234";
}

function applyShopProfileToHeader() {
  const shopName = shopProfile.name || "WEARNWALK";
  if (shopName.toUpperCase() === "WEARNWALK") {
    shopTitle.innerHTML = `<span class="brand-wear">WEAR</span><span class="brand-n">N</span><span class="brand-walk">WALK</span>`;
  } else {
    shopTitle.textContent = shopName;
  }
  shopTagline.textContent = "Inventory & Sales Tracker";
  shopMeta.textContent = shopProfile.tagline || "Style. Comfort. Everyday.";
}

function saveShopProfile(event) {
  event.preventDefault();
  shopProfile = {
    name: shopNameInput.value.trim() || "WEARNWALK",
    owner: shopOwnerInput.value.trim(),
    phone: shopPhoneInput.value.trim(),
    address: shopAddressInput.value.trim(),
    tagline: shopTaglineInput.value.trim() || "Style. Comfort. Everyday.",
    adminPin: shopAdminPinInput.value.trim() || "1234",
  };
  setStored(STORAGE_KEYS.shopProfile, shopProfile);
  applyShopProfileToHeader();
}

function applyRoleView() {
  const isAdmin = activeRole === "admin";
  document.body.classList.toggle("guest-mode", !isAdmin);
  adminOnlySections.forEach((section) => {
    section.classList.toggle("hidden", !isAdmin);
  });
  guestOnlySections.forEach((section) => {
    section.classList.remove("hidden");
  });
  adminPanelLogin.classList.add("hidden");
  activeRoleLabel.textContent = `Active: ${isAdmin ? "Admin (Full Access)" : "Guest"}`;
  renderInventory();
}

function switchToGuestPanel() {
  activeRole = "guest";
  applyRoleView();
}

function askAdminLogin() {
  adminPanelLogin.classList.remove("hidden");
  adminPinInput.value = "";
  adminPinInput.focus();
}

function verifyAdminLogin(event) {
  event.preventDefault();
  const enteredPin = adminPinInput.value.trim();
  const correctPin = shopProfile.adminPin || "1234";
  if (enteredPin !== correctPin) {
    alert("Wrong PIN. Try again.");
    return;
  }
  activeRole = "admin";
  applyRoleView();
}

function slugifyWord(value) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function generateSkuFromName(name) {
  const cleaned = name.trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const base = parts
    .slice(0, 3)
    .map((part) => slugifyWord(part).slice(0, 3))
    .join("-");
  const suffix = String(products.length + 1).padStart(3, "0");
  return `WW-${base || "ITEM"}-${suffix}`;
}

function looksEmpty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function estimatePriceFromName(name) {
  const n = name.toLowerCase();
  if (n.includes("nike")) return 2900;
  if (n.includes("adidas")) return 2700;
  if (n.includes("puma")) return 2400;
  if (n.includes("skechers")) return 2800;
  if (n.includes("asics")) return 2900;
  if (n.includes("crocs") || n.includes("slide")) return 1200;
  if (n.includes("boot")) return 2200;
  return 2500;
}

function guessCategoryFromName(name) {
  const n = name.toLowerCase();
  if (n.includes("boot")) return "Boots";
  if (n.includes("slide") || n.includes("slider") || n.includes("sliper")) return "Slides";
  if (n.includes("crocs")) return "Clogs";
  if (n.includes("lofer") || n.includes("loafer")) return "Loafers";
  return "Footwear";
}

async function fetchOnlineProductHints(productName) {
  const query = encodeURIComponent(productName.trim());
  if (!query) return null;

  const sources = [
    `https://dummyjson.com/products/search?q=${query}`,
    `https://fakestoreapi.com/products`,
  ];

  for (const url of sources) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();

      if (url.includes("dummyjson")) {
        const products = Array.isArray(data.products) ? data.products : [];
        const best = products.find((p) =>
          String(p.title || "").toLowerCase().includes(productName.toLowerCase().split(" ")[0])
        ) || products[0];
        if (!best) continue;
        return {
          category: best.category || "",
          price: Number(best.price) ? Number(best.price) * 90 : null,
        };
      }

      const list = Array.isArray(data) ? data : [];
      const best = list.find((p) =>
        String(p.title || "").toLowerCase().includes(productName.toLowerCase().split(" ")[0])
      ) || list[0];
      if (!best) continue;
      return {
        category: best.category || "",
        price: Number(best.price) ? Number(best.price) * 90 : null,
      };
    } catch (error) {
      // Try next source.
    }
  }

  return null;
}

async function fillMissingProductDetails() {
  const name = productNameInput.value.trim();
  if (!name) return;

  let online = null;
  if (looksEmpty(productCategoryInput.value) || looksEmpty(productPriceInput.value)) {
    online = await fetchOnlineProductHints(name);
  }

  if (looksEmpty(productCategoryInput.value)) {
    productCategoryInput.value = online?.category || guessCategoryFromName(name);
  }
  if (looksEmpty(productPriceInput.value)) {
    const price = Math.round(online?.price || estimatePriceFromName(name));
    productPriceInput.value = String(price);
  }
  if (looksEmpty(productStockInput.value)) {
    productStockInput.value = "1";
  }
}

function getSelectedSizeStock(product, size) {
  const normalizedSize = String(size || "").trim();
  if (!normalizedSize) return getProductTotalStock(product);
  const hasSizeStock = product.sizeStock && Object.keys(product.sizeStock).length > 0;
  if (!hasSizeStock) return getProductTotalStock(product);
  return Number(product.sizeStock[normalizedSize]) || 0;
}

function nextBillNo() {
  const billNo = `WW-${String(billCounter).padStart(5, "0")}`;
  billCounter += 1;
  setStored(STORAGE_KEYS.billCounter, billCounter);
  return billNo;
}

function resetProductForm() {
  productForm.reset();
  productIdInput.value = "";
}

function resetSaleForm() {
  saleForm.reset();
  customerNameInput.value = "Walk-in";
  customerPhoneInput.value = "";
  paymentMethodInput.value = "Cash";
  saleItemsContainer.innerHTML = "";
  addSaleItemRow();
}

function renderInventory() {
  const q = searchInput.value.trim().toLowerCase();
  inventoryBody.innerHTML = "";

  const filtered = products.filter((p) =>
    [p.name, p.sku, p.category].join(" ").toLowerCase().includes(q)
  );

  if (!filtered.length) {
    inventoryBody.innerHTML = `<tr><td colspan="7">No products found.</td></tr>`;
    return;
  }

  filtered.forEach((product) => {
    const tr = document.createElement("tr");
    const actionsCell = activeRole === "admin"
      ? `<td class="actions-cell">
        <button data-edit="${product.id}">Edit</button>
        <button data-delete="${product.id}" class="secondary">Delete</button>
      </td>`
      : `<td>-</td>`;
    tr.innerHTML = `
      <td>${product.name}</td>
      <td>${product.sku}</td>
      <td>${product.category || "-"}</td>
      <td>${product.size || "-"}</td>
      <td>${getProductTotalStock(product)}${product.sizeStock && Object.keys(product.sizeStock).length ? ` (${formatSizeStock(product.sizeStock)})` : ""}</td>
      <td>Rs ${formatMoney(product.price)}</td>
      ${actionsCell}
    `;
    inventoryBody.appendChild(tr);
  });
}

function fillProductOptions(selectEl) {
  selectEl.innerHTML = "";
  const inStock = products.filter((p) => getProductTotalStock(p) > 0);

  if (!inStock.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No in-stock products";
    selectEl.appendChild(option);
    return;
  }

  inStock.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} (${product.sku}) - Stock: ${getProductTotalStock(product)} - Rs ${formatMoney(product.price)}`;
    selectEl.appendChild(option);
  });
}

function getDefaultSizeForProduct(product) {
  if (!product) return "";
  const sizeEntries = Object.entries(product.sizeStock || {}).filter(([, qty]) => Number(qty) > 0);
  if (sizeEntries.length) return sizeEntries[0][0];
  return product.size || "";
}

function addSaleItemRow() {
  const row = document.createElement("div");
  row.className = "sale-item-row";
  row.innerHTML = `
    <div class="grid">
      <label>
        Product
        <input class="sale-item-search" type="text" placeholder="Type product name..." />
        <select class="sale-item-product" required></select>
      </label>
      <label>
        Quantity
        <input class="sale-item-qty" type="number" min="1" value="1" required />
      </label>
      <label>
        Size
        <input class="sale-item-size" type="text" placeholder="Auto from product" />
      </label>
      <label>
        Discount
        <input class="sale-item-discount" type="number" min="0" step="0.01" value="0" />
      </label>
    </div>
    <div class="actions">
      <button type="button" class="secondary sale-item-remove">Remove Item</button>
    </div>
  `;

  const productSelect = row.querySelector(".sale-item-product");
  const productSearch = row.querySelector(".sale-item-search");
  const sizeInput = row.querySelector(".sale-item-size");
  fillProductOptions(productSelect);
  const selectedProduct = products.find((p) => p.id === productSelect.value);
  sizeInput.value = getDefaultSizeForProduct(selectedProduct);
  const selectedText = productSelect.selectedOptions[0]?.textContent || "";
  productSearch.value = selectedText.split(" - Stock:")[0] || "";

  productSelect.addEventListener("change", () => {
    const product = products.find((p) => p.id === productSelect.value);
    sizeInput.value = getDefaultSizeForProduct(product);
    const text = productSelect.selectedOptions[0]?.textContent || "";
    productSearch.value = text.split(" - Stock:")[0] || "";
  });
  productSearch.addEventListener("input", () => {
    const query = productSearch.value.trim().toLowerCase();
    const options = [...productSelect.options];
    let firstVisible = null;

    options.forEach((option) => {
      if (!option.value) {
        option.hidden = false;
        return;
      }
      const match = !query || option.textContent.toLowerCase().includes(query);
      option.hidden = !match;
      if (match && !firstVisible) firstVisible = option;
    });

    if (firstVisible && (productSelect.selectedOptions[0]?.hidden || !productSelect.value)) {
      productSelect.value = firstVisible.value;
      const product = products.find((p) => p.id === productSelect.value);
      sizeInput.value = getDefaultSizeForProduct(product);
    }
  });
  row.querySelector(".sale-item-remove").addEventListener("click", () => {
    if (saleItemsContainer.children.length === 1) return;
    row.remove();
  });
  saleItemsContainer.appendChild(row);
}

function renderSaleProducts() {
  const rows = saleItemsContainer.querySelectorAll(".sale-item-row");
  if (!rows.length) {
    addSaleItemRow();
    return;
  }
  rows.forEach((row) => {
    const productSelect = row.querySelector(".sale-item-product");
    const productSearch = row.querySelector(".sale-item-search");
    const prevValue = productSelect.value;
    fillProductOptions(productSelect);
    if ([...productSelect.options].some((opt) => opt.value === prevValue)) {
      productSelect.value = prevValue;
    }
    const product = products.find((p) => p.id === productSelect.value);
    row.querySelector(".sale-item-size").value = getDefaultSizeForProduct(product);
    const text = productSelect.selectedOptions[0]?.textContent || "";
    productSearch.value = text.split(" - Stock:")[0] || "";
  });
}

function renderSales() {
  salesBody.innerHTML = "";
  if (!sales.length) {
    salesBody.innerHTML = `<tr><td colspan="7">No sales recorded yet.</td></tr>`;
    return;
  }

  [...sales].reverse().forEach((sale) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(sale.date).toLocaleString()}</td>
      <td>${sale.billNo}</td>
      <td>${sale.customer}</td>
      <td>${(sale.items || []).map((item) => item.productName).join(", ")}</td>
      <td>${(sale.items || []).map((item) => item.size || "-").join(", ")}</td>
      <td>${(sale.items || []).reduce((sum, item) => sum + item.qty, 0)}</td>
      <td>Rs ${formatMoney(sale.total)}</td>
    `;
    salesBody.appendChild(tr);
  });
}

async function saveProduct(event) {
  event.preventDefault();
  await fillMissingProductDetails();
  const id = productIdInput.value || crypto.randomUUID();
  const autoSku = generateSkuFromName(productNameInput.value);
  const payload = {
    id,
    name: productNameInput.value.trim(),
    sku: productSkuInput.value.trim() || autoSku,
    category: productCategoryInput.value.trim(),
    size: productSizeInput.value.trim(),
    stock: Number(productStockInput.value),
    price: Number(productPriceInput.value),
  };

  if (!payload.name || !payload.sku || !Number.isFinite(payload.stock) || !Number.isFinite(payload.price) || payload.stock < 0 || payload.price < 0) {
    alert("Please enter valid product details.");
    return;
  }

  const duplicateSku = products.some((p) => p.sku === payload.sku && p.id !== id);
  if (duplicateSku) {
    alert("SKU must be unique.");
    return;
  }

  const idx = products.findIndex((p) => p.id === id);
  const currentSizeStock = idx === -1 ? {} : products[idx].sizeStock || {};
  payload.sizeStock = buildSizeStock(payload.size, payload.stock, currentSizeStock);
  payload.stock = getProductTotalStock(payload);
  if (idx === -1) {
    products.push(payload);
  } else {
    products[idx] = payload;
  }

  setStored(STORAGE_KEYS.products, products);
  resetProductForm();
  renderInventory();
  renderSaleProducts();
}

function onInventoryClick(event) {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const product = products.find((p) => p.id === editId);
    if (!product) return;

    productIdInput.value = product.id;
    productNameInput.value = product.name;
    productSkuInput.value = product.sku;
    productCategoryInput.value = product.category;
    productSizeInput.value = product.size || "";
    productStockInput.value = getProductTotalStock(product);
    productPriceInput.value = product.price;
    return;
  }

  if (deleteId) {
    const ok = confirm("Delete this product?");
    if (!ok) return;
    products = products.filter((p) => p.id !== deleteId);
    setStored(STORAGE_KEYS.products, products);
    renderInventory();
    renderSaleProducts();
  }
}

function generateBill(sale) {
  const node = billTemplate.content.cloneNode(true);
  const root = document.createElement("div");
  root.className = "print-root";
  root.appendChild(node);

  root.querySelector('[data-bill="billNo"]').textContent = sale.billNo;
  root.querySelector('[data-bill="shopName"]').textContent = shopProfile.name || "WEARNWALK";
  root.querySelector('[data-bill="tagline"]').textContent = shopProfile.tagline || "Inventory & Sales Bill";
  root.querySelector('[data-bill="owner"]').textContent = shopProfile.owner || "-";
  root.querySelector('[data-bill="phone"]').textContent = shopProfile.phone || "-";
  root.querySelector('[data-bill="address"]').textContent = shopProfile.address || "-";
  root.querySelector('[data-bill="date"]').textContent = new Date(sale.date).toLocaleString();
  root.querySelector('[data-bill="customer"]').textContent = sale.customer;
  root.querySelector('[data-bill="customerPhone"]').textContent = sale.customerPhone || "-";
  root.querySelector('[data-bill="size"]').textContent = (sale.items || []).map((item) => item.size || "-").join(", ");
  root.querySelector('[data-bill="payment"]').textContent = sale.payment;
  const itemsBody = root.querySelector(".bill-items tbody");
  itemsBody.innerHTML = "";
  (sale.items || []).forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.productName} (${item.size || "-"})</td>
      <td>${item.qty}</td>
      <td>${formatMoney(item.price)}</td>
      <td>${formatMoney(item.subtotal)}</td>
    `;
    itemsBody.appendChild(tr);
  });
  root.querySelector('[data-bill="discount"]').textContent = formatMoney(sale.discount);
  root.querySelector('[data-bill="total"]').textContent = formatMoney(sale.total);

  document.body.appendChild(root);
  window.print();
  root.remove();
}

function saveSale(event) {
  event.preventDefault();
  const customer = customerNameInput.value.trim() || "Walk-in";
  const customerPhone = customerPhoneInput.value.trim();
  const itemRows = [...saleItemsContainer.querySelectorAll(".sale-item-row")];

  if (!itemRows.length) {
    alert("Add at least one item.");
    return;
  }

  const parsedItems = [];
  const deductionMap = new Map();

  for (const row of itemRows) {
    const productId = row.querySelector(".sale-item-product").value;
    const qty = Number(row.querySelector(".sale-item-qty").value);
    const discount = Number(row.querySelector(".sale-item-discount").value || 0);
    const product = products.find((p) => p.id === productId);
    const size = row.querySelector(".sale-item-size").value.trim() || getDefaultSizeForProduct(product);

    if (!product) {
      alert("Select a valid product in all rows.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Quantity must be greater than 0 in all rows.");
      return;
    }
    if (!Number.isFinite(discount) || discount < 0) {
      alert("Discount must be 0 or more in all rows.");
      return;
    }

    const key = `${product.id}::${size}`;
    deductionMap.set(key, (deductionMap.get(key) || 0) + qty);
    const subtotal = qty * product.price;
    parsedItems.push({
      productId: product.id,
      productName: product.name,
      size,
      qty,
      price: product.price,
      subtotal,
      discount,
    });
  }

  for (const [key, requiredQty] of deductionMap.entries()) {
    const [productId, size] = key.split("::");
    const product = products.find((p) => p.id === productId);
    const available = getSelectedSizeStock(product, size);
    if (requiredQty > available) {
      alert(`Only ${available} in stock for ${product.name} size ${size || "-"}.`);
      return;
    }
  }

  const subtotal = parsedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = parsedItems.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(0, subtotal - discount);
  const sale = {
    id: crypto.randomUUID(),
    billNo: nextBillNo(),
    date: new Date().toISOString(),
    customer,
    customerPhone,
    items: parsedItems,
    subtotal,
    discount,
    total,
    payment: paymentMethodInput.value,
  };

  for (const item of parsedItems) {
    const product = products.find((p) => p.id === item.productId);
    const hasSizeStock = product.sizeStock && Object.keys(product.sizeStock).length > 0;
    if (hasSizeStock && item.size) {
      if (!Object.prototype.hasOwnProperty.call(product.sizeStock, item.size)) {
        alert(`Size ${item.size} is not available for ${product.name}.`);
        return;
      }
      product.sizeStock[item.size] = Math.max(0, (Number(product.sizeStock[item.size]) || 0) - item.qty);
    } else {
      product.stock = Math.max(0, getProductTotalStock(product) - item.qty);
    }
    product.stock = getProductTotalStock(product);
  }

  sales.push(sale);
  setStored(STORAGE_KEYS.sales, sales);
  setStored(STORAGE_KEYS.products, products);

  resetSaleForm();
  renderInventory();
  renderSaleProducts();
  renderSales();
  generateBill(sale);
}

productForm.addEventListener("submit", saveProduct);
clearFormBtn.addEventListener("click", resetProductForm);
searchInput.addEventListener("input", renderInventory);
inventoryBody.addEventListener("click", onInventoryClick);
saleForm.addEventListener("submit", saveSale);
shopForm.addEventListener("submit", saveShopProfile);
addSaleItemBtn.addEventListener("click", addSaleItemRow);
openGuestPanelBtn.addEventListener("click", switchToGuestPanel);
openAdminPanelBtn.addEventListener("click", askAdminLogin);
adminLoginForm.addEventListener("submit", verifyAdminLogin);

async function initApp() {
  fillShopForm();
  applyShopProfileToHeader();
  switchToGuestPanel();
  await importSeedProducts();
  normalizeProductsData();
  renderInventory();
  renderSaleProducts();
  renderSales();
  resetSaleForm();
}

initApp();
