// =========================================
// 1. FIREBASE CONFIGURATION & SETUP
// =========================================
const firebaseConfig = {
    apiKey: "AIzaSyDgj9FmivigMgfEo-DfzgBt6qTl2qn-E10",
    authDomain: "bitesbyraf.firebaseapp.com",
    projectId: "bitesbyraf",
    storageBucket: "bitesbyraf.firebasestorage.app",
    messagingSenderId: "447929049168",
    appId: "1:447929049168:web:8211af50c4f24ed3d13155",
    measurementId: "G-H89PWQXLDD"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const CART_KEY = 'bitesbyraf_cart';

// =========================================
// 2. VISUAL ANIMATION LOGIC (SCROLL REVEAL)
// =========================================

// This function finds elements and adds the 'is-visible' class when scrolled into view
// =========================================
// 2. VISUAL ANIMATION LOGIC (SCROLL REVEAL)
// =========================================

function attachScrollObserver() {
    // Select elements to animate
    const targets = document.querySelectorAll('.card, .section-title, .hero-content-wrapper, h1, h2, table, .two-col');
    
    const observerOptions = {
        root: null,
        threshold: 0.10, 
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove the waiting state and trigger the animation
                entry.target.classList.remove('reveal-waiting');
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    targets.forEach(target => {
        // Ensure the base animation class is present
        if (!target.classList.contains('reveal-on-scroll')) {
            target.classList.add('reveal-on-scroll');
        }
        
        // Apply the waiting class and start observing (even if already had reveal-on-scroll)
        if (!target.classList.contains('is-visible')) {
            target.classList.add('reveal-waiting'); 
            observer.observe(target);
        }
    });
}

// =========================================
// 3. ADMIN SECURITY & AUTH
// =========================================

function checkAdminSecurity() {
    const isAdminPage = window.location.pathname.includes('admin.html');
    const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn') === 'true';
    if (isAdminPage && !isLoggedIn) {
        window.location.href = "login.html";
    }
}

window.logoutAdmin = function() {
    if (confirm("Are you sure you want to logout?")) {
        sessionStorage.removeItem('isAdminLoggedIn');
        window.location.href = "login.html";
    }
};

// =========================================
// 4. ADMIN PANEL LOGIC (TABS & ORDERS)
// =========================================

window.switchTab = function(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
};

async function renderOrders() {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;
    try {
        const snapshot = await db.collection('orders').where('status', '==', 'Pending').get();
        tableBody.innerHTML = '';
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No pending orders!</td></tr>';
            return;
        }
        snapshot.forEach(doc => {
            const order = doc.data();
            const orderId = doc.id;
            let itemsHtml = '<ul class="order-item-list">';
            order.items.forEach(item => { itemsHtml += `<li>${item.name} x${item.quantity}</li>`; });
            itemsHtml += '</ul>';
            const row = tableBody.insertRow();
            
            row.innerHTML = `
                <td><strong>${order.customerName}</strong><br><span style="font-size:0.8rem; color: #666;">${order.phone}</span></td>
                <td>${itemsHtml}</td>
                <td>RM ${order.total.toFixed(2)}</td>
                <td>
                    <button onclick="window.open('order_confirmation.html?id=${orderId}', '_blank')" class="btn" style="background: #666; font-size: 0.8rem; padding: 5px 10px; margin-right:5px;">Receipt 📄</button>
                    <button onclick="markOrderDone('${orderId}')" class="btn" style="background: #4CAF50; font-size: 0.8rem; padding: 5px 10px;">Done ✅</button>
                </td>`;
        });
        attachScrollObserver(); // Animate new rows
    } catch (e) { console.error(e); }
}

async function renderHistory() {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;
    try {
        const snapshot = await db.collection('orders').where('status', '==', 'Completed').get();
        tableBody.innerHTML = '';
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No completed orders yet.</td></tr>';
            return;
        }
        snapshot.forEach(doc => {
            const order = doc.data();
            const orderId = doc.id;
            let itemsHtml = '<ul class="order-item-list">';
            order.items.forEach(item => { itemsHtml += `<li>${item.name} x${item.quantity}</li>`; });
            itemsHtml += '</ul>';
            const row = tableBody.insertRow();
            
            row.innerHTML = `
                <td style="opacity: 0.7"><strong>${order.customerName}</strong><br><span style="font-size:0.8rem;">${order.phone}</span></td>
                <td style="opacity: 0.7">${itemsHtml}</td>
                <td style="opacity: 0.7">RM ${order.total.toFixed(2)}</td>
                <td>
                    <button onclick="window.open('order_confirmation.html?id=${orderId}', '_blank')" class="btn" style="background: #999; font-size: 0.8rem; padding: 5px 10px;">View Receipt</button>
                    <span style="color: green; font-weight: bold; font-size: 0.8rem; margin-left: 10px;">COMPLETED</span>
                </td>`;
        });
        attachScrollObserver(); // Animate new rows
    } catch (e) { console.error(e); }
}

window.markOrderDone = async function(orderId) {
    if (confirm("Mark this order as completed?")) {
        try {
            await db.collection('orders').doc(orderId).update({ status: 'Completed' });
            showToast("Order marked as done!");
            renderOrders();   
            renderHistory();  
        } catch (e) { showToast("Error updating order."); }
    }
};

// =========================================
// 5. PRODUCT MANAGEMENT (CRUD)
// =========================================

window.editProduct = async function(id) {
    try {
        const doc = await db.collection('products').doc(id).get();
        if (!doc.exists) return;
        const p = doc.data();
        const safeSet = (elementId, value) => { const el = document.getElementById(elementId); if (el) el.value = value; };
        safeSet('admin-p-id', id);
        safeSet('admin-p-name', p.name);
        safeSet('admin-p-category', p.category);
        safeSet('admin-p-price', p.price);
        safeSet('admin-p-image', p.image.replace('images/products/', ''));
        safeSet('admin-p-short-desc', p.shortDesc || '');
        safeSet('admin-p-long-desc', p.longDesc || '');
        document.getElementById('form-title').textContent = "Update Treat";
        document.getElementById('admin-submit-btn').textContent = "Save Changes";
        document.getElementById('admin-cancel-btn').style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { console.error(e); }
};

window.resetAdminForm = function() {
    const form = document.getElementById('add-product-form');
    if (form) form.reset();
    document.getElementById('admin-p-id').value = '';
    document.getElementById('form-title').textContent = "Add New Treat";
    document.getElementById('admin-submit-btn').textContent = "Add Product to Menu";
    document.getElementById('admin-cancel-btn').style.display = "none";
};

window.deleteProduct = async function(id) {
    if (confirm("Delete this product?")) {
        await db.collection('products').doc(id).delete();
        showToast("Product deleted!");
        renderAdminInventory();
        renderMenu();
    }
};

async function renderAdminInventory() {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;
    try {
        const snapshot = await db.collection('products').get();
        tableBody.innerHTML = '';
        snapshot.forEach(doc => {
            const item = doc.data();
            const row = tableBody.insertRow();
            row.innerHTML = `<td>${item.name}</td><td>${item.category}</td><td>RM ${item.price.toFixed(2)}</td><td><button onclick="editProduct('${doc.id}')" style="color:blue; border:none; background:none; cursor:pointer;">Edit</button><button onclick="deleteProduct('${doc.id}')" style="color:red; border:none; background:none; cursor:pointer; margin-left:10px;">Delete</button></td>`;
        });
        attachScrollObserver(); 
    } catch (e) { console.error(e); }
}

async function handleAddProduct(e) {
    e.preventDefault();
    const id = document.getElementById('admin-p-id').value;
    const fileName = document.getElementById('admin-p-image').value;
    const productData = {
        name: document.getElementById('admin-p-name').value,
        category: document.getElementById('admin-p-category').value,
        price: parseFloat(document.getElementById('admin-p-price').value),
        image: fileName ? 'images/products/' + fileName : 'images/products/placeholder.png',
        shortDesc: document.getElementById('admin-p-short-desc').value,
        longDesc: document.getElementById('admin-p-long-desc').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        if (id) { await db.collection('products').doc(id).update(productData); showToast("Updated!"); }
        else { await db.collection('products').add(productData); showToast("Added!"); }
        resetAdminForm(); renderAdminInventory();
    } catch (e) { showToast("Error!"); }
}

// =========================================
// 6. CART & CHECKOUT LOGIC
// =========================================

function loadCart() {
    const cartString = localStorage.getItem(CART_KEY);
    return cartString ? JSON.parse(cartString) : [];
}

window.addToCart = function(productId, name, price) {
    let cart = loadCart();
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) existingItem.quantity += 1;
    else cart.push({ id: productId, name: name, price: parseFloat(price), quantity: 1 });
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
    showToast(`Added ${name} to cart!`);
    if (document.getElementById('cart-table-body')) window.renderCart();
};

window.changeQuantity = function(index, delta) {
    let cart = loadCart();
    cart[index].quantity += delta;
    if (cart[index].quantity < 1) {
        cart.splice(index, 1);
    }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
    window.renderCart();
};

window.removeItemFromCart = function(index) {
    let cart = loadCart();
    cart.splice(index, 1);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.renderCart();
    updateCartCount();
};

window.clearCart = function() {
    if (confirm("Clear your entire cart?")) {
        localStorage.removeItem(CART_KEY);
        updateCartCount();
        if (document.getElementById('cart-table-body')) window.renderCart();
    }
};

window.renderCart = function() {
    const cart = loadCart();
    const tableBody = document.getElementById('cart-table-body');
    const totalsDiv = document.getElementById('cart-totals');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    let subtotal = 0;
    if (cart.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;">Your cart is empty!</td></tr>';
        if (totalsDiv) totalsDiv.innerHTML = '<h3>Total: RM 0.00</h3>';
        return;
    }
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td><strong>${item.name}</strong><br><button onclick="removeItemFromCart(${index})" style="color:red; background:none; border:none; cursor:pointer; font-size:0.8rem;">Remove</button></td>
            <td>RM ${item.price.toFixed(2)}</td>
            <td>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="changeQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
                </div>
            </td>
            <td>RM ${itemTotal.toFixed(2)}</td>`;
    });
    if (totalsDiv) {
        const total = subtotal + 5.00;
        totalsDiv.innerHTML = `<p>Subtotal: <span style="float:right;">RM ${subtotal.toFixed(2)}</span></p><p>Delivery: <span style="float:right;">RM 5.00</span></p><hr><h3>Total: <span style="float:right; color:var(--primary-pink);">RM ${total.toFixed(2)}</span></h3><a href="checkout.html" class="btn btn-block">Proceed to Checkout</a>`;
    }
    attachScrollObserver(); // Re-animate cart items
};

window.renderCheckoutSummary = function() {
    const cart = loadCart();
    const summaryList = document.getElementById('summary-list');
    const totalsDiv = document.getElementById('summary-totals');
    if (!summaryList || !totalsDiv) return;
    summaryList.innerHTML = '';
    let subtotal = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        summaryList.innerHTML += `<div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>${item.name} x${item.quantity}</span><span>RM ${itemTotal.toFixed(2)}</span></div>`;
    });
    const total = subtotal + 5.00;
    totalsDiv.innerHTML = `<p>Subtotal: <span style="float:right;">RM ${subtotal.toFixed(2)}</span></p><p>Delivery: <span style="float:right;">RM 5.00</span></p><hr><h3>Total: <span style="float:right; color: var(--primary-pink);">RM ${total.toFixed(2)}</span></h3>`;
    attachScrollObserver(); 
};

window.handleCheckout = async function(e) {
    e.preventDefault();
    const cart = loadCart();
    if (cart.length === 0) return;

    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    if (cardNumber === "0000") {
        window.location.href = "payment_failure.html";
        return; 
    }

    const customerName = document.getElementById('cust-name').value;
    
    const orderData = {
        customerName: customerName,
        email: document.getElementById('cust-email').value,
        phone: document.getElementById('cust-phone').value,
        address: document.getElementById('cust-address').value,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 5.00,
        status: "Pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const docRef = await db.collection('orders').add(orderData);
        localStorage.removeItem(CART_KEY);
        window.location.href = "order_confirmation.html?id=" + docRef.id;
    } catch (error) { 
        console.error("Checkout Error:", error);
        showToast("Order Failed. Please try again."); 
    }
};

// =========================================
// 7. MENU RENDERING
// =========================================

async function renderMenu() {
    const containers = {
        'Brownies': document.getElementById('container-brownies'),
        'Burnt Cheese Cake': document.getElementById('container-cheesecake'),
        'Cupcakes': document.getElementById('container-cupcakes')
    };

    if (!Object.values(containers).some(c => c)) return;
    try {
        const snapshot = await db.collection('products').get();
        Object.values(containers).forEach(div => { if(div) div.innerHTML = ''; });
        snapshot.forEach(doc => {
            const p = doc.data();
            let categoryKey = Object.keys(containers).find(key => key.toLowerCase() === p.category.toLowerCase());
            const targetDiv = containers[categoryKey];

            if (targetDiv) {
                targetDiv.innerHTML += `
                    <div class="card">
                        <a href="product_details.html?id=${doc.id}"><img src="${p.image}" alt="${p.name}" style="width:100%; height:200px; object-fit:cover; border-radius: 12px 12px 0 0;"></a>
                        <div style="padding:15px; flex:1; display:flex; flex-direction:column;">
                            <h3>${p.name}</h3>
                            <p style="font-size: 0.85rem; color: #666; margin-bottom:10px;">${p.shortDesc || ''}</p>
                            <span class="price">RM ${p.price.toFixed(2)}</span>
                            <button onclick="addToCart('${doc.id}', '${p.name}', ${p.price})" class="btn btn-block" style="margin-top:auto;">Add to Cart</button>
                        </div>
                    </div>`;
            }
        });
        
        // 🔧 KEY ANIMATION STEP: Attach observer AFTER creating elements
        attachScrollObserver();

        if (window.location.hash) {
            const targetId = window.location.hash;
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                setTimeout(() => {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    } catch (e) { console.error(e); }
}

// =========================================
// 8. GLOBAL INITIALIZATION
// =========================================

function updateCartCount() {
    const cart = loadCart();
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'inline' : 'none';
    }
}

function showToast(msg) {
    const toast = document.getElementById("toast-box");
    if (toast) { toast.textContent = msg; toast.className = "show"; setTimeout(() => { toast.className = ""; }, 3000); }
}

// Master Init
document.addEventListener('DOMContentLoaded', () => {
    // 1. Core Logic
    checkAdminSecurity();
    updateCartCount();
    renderMenu();
    renderAdminInventory();
    renderOrders();
    renderHistory();
    window.renderCart(); 
    window.renderCheckoutSummary();
    const addForm = document.getElementById('add-product-form');
    if (addForm) addForm.addEventListener('submit', handleAddProduct);

    // 2. Attach animations to static elements immediately (Hero, Titles)
    attachScrollObserver();
});