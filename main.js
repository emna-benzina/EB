// ==============================================
// TunisieVêtements - Script Principal
// E-commerce de vêtements en Tunisie
// ==============================================

// Stockage localStorage pour Tunisie
const STORAGE_KEYS = {
    CART: 'tunisie_vetements_cart',
    USER: 'tunisie_vetements_user',
    THEME: 'tunisie_vetements_theme'
};

// Panier d'achat
class ShoppingCart {
    constructor() {
        this.cart = this.loadCart();
        this.init();
    }

    // Charger le panier depuis localStorage
    loadCart() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.CART)) || [];
        } catch (error) {
            console.error('Erreur chargement panier:', error);
            return [];
        }
    }

    // Sauvegarder le panier
    saveCart() {
        try {
            localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(this.cart));
            this.updateCartCount();
            this.updateCartUI();
        } catch (error) {
            console.error('Erreur sauvegarde panier:', error);
        }
    }

    // Initialiser le panier
    init() {
        this.updateCartCount();
        this.setupEventListeners();
    }

    // Ajouter un produit au panier
    addProduct(product) {
        const existingItem = this.cart.find(item => 
            item.id === product.id && 
            item.size === product.size && 
            item.color === product.color
        );

        if (existingItem) {
            existingItem.quantity += product.quantity;
        } else {
            this.cart.push({
                ...product,
                addedAt: new Date().toISOString()
            });
        }

        this.saveCart();
        this.showNotification(`${product.name} ajouté au panier!`);
        return true;
    }

    // Supprimer un produit du panier
    removeProduct(productId, size, color) {
        this.cart = this.cart.filter(item => 
            !(item.id === productId && item.size === size && item.color === color)
        );
        this.saveCart();
        this.showNotification('Produit retiré du panier');
    }

    // Mettre à jour la quantité
    updateQuantity(productId, size, color, newQuantity) {
        const item = this.cart.find(item => 
            item.id === productId && item.size === size && item.color === color
        );
        
        if (item && newQuantity > 0) {
            item.quantity = newQuantity;
            this.saveCart();
        }
    }

    // Calculer les totaux
    calculateTotals() {
        const subtotal = this.cart.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0
        );

        // Frais de livraison Tunisie
        const shipping = this.calculateShipping();
        const total = subtotal + shipping;

        return {
            subtotal: this.formatPrice(subtotal),
            shipping: this.formatPrice(shipping),
            total: this.formatPrice(total),
            rawSubtotal: subtotal,
            rawShipping: shipping,
            rawTotal: total
        };
    }

    // Calculer frais de livraison (Tunisie)
    calculateShipping() {
        const subtotal = this.calculateTotals().rawSubtotal;
        
        // Livraison gratuite à partir de 200 TND
        if (subtotal >= 200) {
            return 0;
        }

        // Sinon 7 TND standard
        return 7.000;
    }

    // Vider le panier
    clearCart() {
        this.cart = [];
        this.saveCart();
    }

    // Mettre à jour le compteur
    updateCartCount() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = totalItems;
        });
    }

    // Mettre à jour l'interface du panier
    updateCartUI() {
        // Si on est sur la page panier
        if (document.querySelector('.cart-items')) {
            this.renderCartItems();
        }
    }

    // Afficher les produits dans le panier
    renderCartItems() {
        const container = document.querySelector('.cart-items');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Votre panier est vide</h3>
                    <p>Ajoutez des produits pour commencer vos achats</p>
                    <a href="shop.html" class="btn">Voir les produits</a>
                </div>
            `;
            return;
        }

        container.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-id="${item.id}" data-size="${item.size}" data-color="${item.color}">
                <img src="${item.image}" alt="${item.name}">
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p class="item-variants">Taille: ${item.size} | Couleur: ${item.color}</p>
                    <p class="item-sku">${item.sku || ''}</p>
                </div>
                <div class="item-price">
                    ${this.formatPrice(item.price)}
                </div>
                <div class="item-quantity">
                    <button class="qty-btn minus">-</button>
                    <input type="number" value="${item.quantity}" min="1" class="qty-input">
                    <button class="qty-btn plus">+</button>
                </div>
                <div class="item-subtotal">
                    ${this.formatPrice(item.price * item.quantity)}
                </div>
                <button class="remove-item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        // Ajouter les événements
        this.setupCartEventListeners();
        this.updateOrderSummary();
    }

    // Mettre à jour le résumé de commande
    updateOrderSummary() {
        const totals = this.calculateTotals();
        
        document.querySelectorAll('.subtotal').forEach(el => {
            el.textContent = totals.subtotal;
        });
        
        document.querySelectorAll('.shipping').forEach(el => {
            el.textContent = totals.shipping === '0.000 TND' ? 'Gratuit' : totals.shipping;
        });
        
        document.querySelectorAll('.total').forEach(el => {
            el.textContent = totals.total;
        });

        // Afficher/Masquer livraison gratuite
        const freeShippingMsg = document.querySelector('.free-shipping');
        if (freeShippingMsg) {
            if (totals.rawSubtotal >= 200) {
                freeShippingMsg.style.display = 'block';
            } else {
                const needed = (200 - totals.rawSubtotal).toFixed(3);
                freeShippingMsg.innerHTML = `Ajoutez <strong>${needed} TND</strong> pour la livraison gratuite!`;
                freeShippingMsg.style.display = 'block';
            }
        }
    }

    // Configurer les événements du panier
    setupCartEventListeners() {
        // Boutons quantité
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemEl = e.target.closest('.cart-item');
                const id = itemEl.dataset.id;
                const size = itemEl.dataset.size;
                const color = itemEl.dataset.color;
                const input = itemEl.querySelector('.qty-input');
                let quantity = parseInt(input.value);

                if (e.target.classList.contains('minus')) {
                    quantity = Math.max(1, quantity - 1);
                } else if (e.target.classList.contains('plus')) {
                    quantity += 1;
                }

                this.updateQuantity(id, size, color, quantity);
                input.value = quantity;
            });
        });

        // Input quantité
        document.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const itemEl = e.target.closest('.cart-item');
                const id = itemEl.dataset.id;
                const size = itemEl.dataset.size;
                const color = itemEl.dataset.color;
                const quantity = parseInt(e.target.value) || 1;

                this.updateQuantity(id, size, color, quantity);
            });
        });

        // Supprimer produit
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemEl = e.target.closest('.cart-item');
                const id = itemEl.dataset.id;
                const size = itemEl.dataset.size;
                const color = itemEl.dataset.color;

                this.removeProduct(id, size, color);
                itemEl.remove();
            });
        });
    }

    // Configurer événements généraux
    setupEventListeners() {
        // Boutons "Ajouter au panier"
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart')) {
                const btn = e.target.closest('.add-to-cart');
                const productCard = btn.closest('.product-card');
                
                const product = {
                    id: parseInt(btn.dataset.id) || this.getRandomId(),
                    name: productCard.querySelector('h3').textContent,
                    price: this.parsePrice(productCard.querySelector('.current').textContent),
                    image: productCard.querySelector('img').src,
                    quantity: 1,
                    size: 'M', // Par défaut
                    color: 'Bleu' // Par défaut
                };

                this.addProduct(product);
            }
        });

        // Bouton vider panier
        const clearBtn = document.querySelector('.clear-cart');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Voulez-vous vider votre panier?')) {
                    this.clearCart();
                }
            });
        }
    }

    // Afficher notification
    showNotification(message, type = 'success') {
        // Créer notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Styles notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 15px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        // Bouton fermer
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Supprimer auto après 4s
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }

    // Formater prix TND
    formatPrice(amount) {
        return amount.toFixed(3) + ' TND';
    }

    // Parser prix depuis string
    parsePrice(priceString) {
        return parseFloat(priceString.replace(' TND', '').replace(/\./g, '').replace(',', '.'));
    }

    // Générer ID aléatoire
    getRandomId() {
        return Math.floor(Math.random() * 1000000);
    }
}

// ==============================================
// Gestion Utilisateurs
// ==============================================

class UserManager {
    constructor() {
        this.currentUser = this.loadUser();
    }

    loadUser() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
        } catch (error) {
            return null;
        }
    }

    saveUser(user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        this.currentUser = user;
        this.updateUserUI();
    }

    logout() {
        localStorage.removeItem(STORAGE_KEYS.USER);
        this.currentUser = null;
        this.updateUserUI();
        window.location.href = 'index.html';
    }

    updateUserUI() {
        const loginBtn = document.querySelector('.user-btn');
        const userMenu = document.querySelector('.user-menu');
        
        if (this.currentUser) {
            if (loginBtn) {
                loginBtn.innerHTML = `
                    <i class="fas fa-user"></i>
                    <span>${this.currentUser.firstName}</span>
                `;
                loginBtn.href = 'account.html';
            }
            
            if (userMenu) {
                userMenu.style.display = 'block';
                userMenu.querySelector('.user-email').textContent = this.currentUser.email;
            }
        } else {
            if (loginBtn) {
                loginBtn.innerHTML = `
                    <i class="fas fa-user"></i>
                    <span>Connexion</span>
                `;
                loginBtn.href = 'login.html';
            }
        }
    }

    // Inscription utilisateur
    register(userData) {
        // Simuler enregistrement
        const user = {
            id: Date.now(),
            ...userData,
            createdAt: new Date().toISOString(),
            orders: []
        };
        
        this.saveUser(user);
        return { success: true, user };
    }

    // Connexion
    login(email, password) {
        // Simuler vérification
        const users = [
            {
                email: 'client@tunisie.tn',
                password: '123456',
                firstName: 'Ahmed',
                lastName: 'Ben Ali'
            }
        ];
        
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            this.saveUser(user);
            return { success: true, user };
        }
        
        return { success: false, message: 'Email ou mot de passe incorrect' };
    }
}

// ==============================================
// Gestion Produits
// ==============================================

class ProductManager {
    constructor() {
        this.products = this.getSampleProducts();
    }

    getSampleProducts() {
        return [
            {
                id: 1,
                name: "Jebba Traditionnelle Bleue",
                description: "Jebba tunisienne 100% coton, fabriquée artisanalement",
                price: 129.000,
                oldPrice: 169.000,
                category: "traditionnel",
                images: [
                    "https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=600"
                ],
                sizes: ["S", "M", "L", "XL"],
                colors: ["Bleu", "Blanc", "Noir"],
                stock: 25,
                rating: 4.2,
                reviews: 42,
                sku: "JEB-001"
            },
            {
                id: 2,
                name: "Chemise Homme Lin",
                description: "Chemise légère en lin naturel pour l'été",
                price: 89.000,
                category: "homme",
                images: [
                    "https://images.unsplash.com/photo-1598032895397-b9472444bf93?q=80&w=600"
                ],
                sizes: ["S", "M", "L", "XL"],
                colors: ["Blanc", "Bleu", "Gris"],
                stock: 50,
                rating: 4.5,
                reviews: 36,
                sku: "CHM-002"
            },
            {
                id: 3,
                name: "Robe de Soirée Tunisienne",
                description: "Robe élégante en soie avec broderies artisanales",
                price: 299.000,
                category: "femme",
                images: [
                    "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=600"
                ],
                sizes: ["XS", "S", "M", "L"],
                colors: ["Rouge", "Noir", "Or"],
                stock: 15,
                rating: 4.0,
                reviews: 28,
                sku: "ROB-003"
            },
            {
                id: 4,
                name: "Burnous Traditionnel",
                description: "Burnous en laine pure pour l'hiver",
                price: 199.000,
                category: "traditionnel",
                images: [
                    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=600"
                ],
                sizes: ["M", "L", "XL", "XXL"],
                colors: ["Marron", "Beige", "Noir"],
                stock: 10,
                rating: 4.8,
                reviews: 51,
                sku: "BUR-004"
            }
        ];
    }

    // Filtrer produits par catégorie
    getProductsByCategory(category) {
        if (!category) return this.products;
        return this.products.filter(product => product.category === category);
    }

    // Rechercher produits
    searchProducts(query) {
        query = query.toLowerCase();
        return this.products.filter(product => 
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query)
        );
    }

    // Obtenir produit par ID
    getProductById(id) {
        return this.products.find(product => product.id === id);
    }
}

// ==============================================
// Gestion Commandes
// ==============================================

class OrderManager {
    constructor() {
        this.orders = this.loadOrders();
    }

    loadOrders() {
        try {
            return JSON.parse(localStorage.getItem('tunisie_orders')) || [];
        } catch (error) {
            return [];
        }
    }

    saveOrders() {
        localStorage.setItem('tunisie_orders', JSON.stringify(this.orders));
    }

    createOrder(orderData) {
        const order = {
            id: 'TUN-' + Date.now(),
            ...orderData,
            status: 'en_attente',
            createdAt: new Date().toISOString(),
            trackingNumber: 'TN' + Math.random().toString(36).substr(2, 9).toUpperCase()
        };

        this.orders.unshift(order);
        this.saveOrders();
        return order;
    }

    getOrderById(id) {
        return this.orders.find(order => order.id === id);
    }

    getUserOrders(userId) {
        return this.orders.filter(order => order.userId === userId);
    }
}

// ==============================================
// Gestion UI/UX
// ==============================================

class UIManager {
    constructor() {
        this.setupAnimations();
        this.setupMobileMenu();
        this.setupFilters();
        this.setupTheme();
    }

    // Animations scroll
    setupAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observer les éléments à animer
        document.querySelectorAll('.product-card, .category-card, .service-item').forEach(el => {
            observer.observe(el);
        });
    }

    // Menu mobile
    setupMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const mainNav = document.querySelector('.main-nav');
        
        if (menuToggle && mainNav) {
            menuToggle.addEventListener('click', () => {
                mainNav.classList.toggle('show');
                menuToggle.classList.toggle('active');
            });
        }
    }

    // Filtres produits
    setupFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const sortSelect = document.querySelector('#sort-products');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.dataset.category;
                this.filterProducts(category);
            });
        });
        
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortProducts(e.target.value);
            });
        }
    }

    // Filtrer produits
    filterProducts(category) {
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Trier produits
    sortProducts(criteria) {
        // Implémentation du tri
        console.log('Trier par:', criteria);
    }

    // Thème sombre/clair
    setupTheme() {
        const themeToggle = document.querySelector('.theme-toggle');
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
        
        document.body.classList.toggle('dark-theme', savedTheme === 'dark');
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.toggle('dark-theme');
                localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
                
                themeToggle.innerHTML = isDark ? 
                    '<i class="fas fa-sun"></i>' : 
                    '<i class="fas fa-moon"></i>';
            });
            
            themeToggle.innerHTML = savedTheme === 'dark' ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
    }

    // Afficher modal
    showModal(content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close"><i class="fas fa-times"></i></button>
                ${content}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// ==============================================
// Fonctions de Paiement (Tunisie)
// ==============================================

class PaymentManager {
    // Méthodes de paiement disponibles en Tunisie
    static METHODS = {
        CIB: 'carte',
        MANDAT: 'mandat',
        LIVRAISON: 'livraison',
        FLOUCI: 'flouci',
        EDINAR: 'e-dinar'
    };

    // Simuler paiement
    static processPayment(method, amount, orderId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const success = Math.random() > 0.1; // 90% de succès
                
                if (success) {
                    resolve({
                        success: true,
                        transactionId: 'TXN_' + Date.now(),
                        message: 'Paiement effectué avec succès'
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Échec du paiement. Veuillez réessayer.'
                    });
                }
            }, 1500);
        });
    }

    // Calculer frais selon méthode
    static getFees(method, amount) {
        const fees = {
            'carte': 0, // Pas de frais pour carte
            'mandat': 5.000, // Frais mandat
            'livraison': 0,
            'flouci': 0,
            'e-dinar': 0
        };
        
        return fees[method] || 0;
    }
}

// ==============================================
// Fonctions de Livraison (Tunisie)
// ==============================================

class ShippingManager {
    // Gouvernorats tunisiens avec frais
    static GOVERNORATES = [
        { name: "Tunis", cost: 7.000, days: 1 },
        { name: "Ariana", cost: 7.000, days: 1 },
        { name: "Ben Arous", cost: 7.000, days: 1 },
        { name: "Manouba", cost: 7.000, days: 1 },
        { name: "Nabeul", cost: 9.000, days: 2 },
        { name: "Sousse", cost: 8.000, days: 2 },
        { name: "Monastir", cost: 8.000, days: 2 },
        { name: "Sfax", cost: 8.000, days: 2 },
        { name: "Autres", cost: 12.000, days: 3 }
    ];

    // Calculer frais de livraison
    static calculateCost(gouvernorat, subtotal) {
        const gov = this.GOVERNORATES.find(g => g.name === gouvernorat) || this.GOVERNORATES[8];
        
        // Livraison gratuite > 200 TND
        if (subtotal >= 200) {
            return { cost: 0, days: gov.days, free: true };
        }
        
        return { cost: gov.cost, days: gov.days, free: false };
    }

    // Générer sélecteur de gouvernorat
    static generateGovernorateSelect(selected = '') {
        return `
            <select id="shipping-governorate" class="form-select">
                <option value="">Sélectionnez votre gouvernorat</option>
                ${this.GOVERNORATES.map(gov => `
                    <option value="${gov.name}" ${gov.name === selected ? 'selected' : ''}>
                        ${gov.name} - ${gov.cost} TND (${gov.days} jour${gov.days > 1 ? 's' : ''})
                    </option>
                `).join('')}
            </select>
        `;
    }
}

// ==============================================
// Initialisation Globale
// ==============================================

// Initialiser toutes les instances
const cart = new ShoppingCart();
const userManager = new UserManager();
const productManager = new ProductManager();
const orderManager = new OrderManager();
const uiManager = new UIManager();

// Variables globales accessibles
window.tunisieVetements = {
    cart,
    userManager,
    productManager,
    orderManager,
    uiManager,
    PaymentManager,
    ShippingManager
};

// ==============================================
// Fonctions Utilitaires Globales
// ==============================================

// Formater date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-TN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Valider email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Valider téléphone Tunisie
function isValidPhone(phone) {
    const re = /^(\+216|00216)?[2459][0-9]{7}$/;
    return re.test(phone.replace(/\s/g, ''));
}

// Copier dans presse-papiers
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            cart.showNotification('Copié dans le presse-papiers');
        })
        .catch(err => {
            console.error('Erreur copie:', err);
        });
}

// Défilement fluide
function smoothScroll(target) {
    const element = document.querySelector(target);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// ==============================================
// Événements au chargement
// ==============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser compteur panier
    cart.updateCartCount();
    
    // Initialiser UI utilisateur
    userManager.updateUserUI();
    
    // Configuration recherche
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-bar button');
    
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
        }
    }
    
    // Gestion des produits sur la page boutique
    if (window.location.pathname.includes('shop.html')) {
        loadShopProducts();
    }
    
    // Gestion page produit
    if (window.location.pathname.includes('product.html')) {
        loadProductDetails();
    }
    
    // Ajouter CSS animations
    addAnimationStyles();
});

// Charger produits boutique
function loadShopProducts() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('cat');
    const search = urlParams.get('search');
    
    const container = document.querySelector('.products-grid');
    if (!container) return;
    
    let products = productManager.products;
    
    if (category) {
        products = productManager.getProductsByCategory(category);
    }
    
    if (search) {
        products = productManager.searchProducts(search);
        document.querySelector('.search-bar input').value = search;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card" data-category="${product.category}">
            ${product.oldPrice ? `<div class="product-badge">-${Math.round((1 - product.price/product.oldPrice) * 100)}%</div>` : ''}
            <div class="product-image">
                <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
                <button class="quick-view" onclick="showQuickView(${product.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-price">
                    <span class="current">${cart.formatPrice(product.price)}</span>
                    ${product.oldPrice ? `<span class="old">${cart.formatPrice(product.oldPrice)}</span>` : ''}
                </div>
                <div class="product-rating">
                    ${generateStars(product.rating)}
                    <span>(${product.reviews})</span>
                </div>
                <button class="add-to-cart" data-id="${product.id}">
                    <i class="fas fa-cart-plus"></i> Ajouter au panier
                </button>
            </div>
        </div>
    `).join('');
}

// Charger détails produit
function loadProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    
    const product = productManager.getProductById(productId);
    if (!product) return;
    
    // Mettre à jour la page
    document.title = `${product.name} - TunisieVêtements`;
    
    const container = document.querySelector('.product-detail');
    if (container) {
        container.innerHTML = `
            <div class="product-images">
                <img src="${product.images[0]}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h1>${product.name}</h1>
                <p class="product-description">${product.description}</p>
                
                <div class="product-price">
                    <span class="current">${cart.formatPrice(product.price)}</span>
                    ${product.oldPrice ? `<span class="old">${cart.formatPrice(product.oldPrice)}</span>` : ''}
                </div>
                
                <div class="product-options">
                    <div class="option">
                        <label>Taille:</label>
                        <select id="sizeSelect">
                            ${product.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="option">
                        <label>Couleur:</label>
                        <div class="color-options">
                            ${product.colors.map(color => `
                                <button class="color-option" data-color="${color}" style="background-color: ${getColorHex(color)}">
                                    ${color}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <button class="add-to-cart-btn" onclick="addToProductCart(${product.id})">
                    <i class="fas fa-cart-plus"></i> Ajouter au panier
                </button>
            </div>
        `;
    }
}

// Fonction pour ajouter produit spécifique
function addToProductCart(productId) {
    const product = productManager.getProductById(productId);
    const size = document.getElementById('sizeSelect')?.value || 'M';
    const color = document.querySelector('.color-option.active')?.dataset.color || product.colors[0];
    
    if (product) {
        cart.addProduct({
            ...product,
            size,
            color,
            quantity: 1
        });
    }
}

// Afficher aperçu rapide
function showQuickView(productId) {
    const product = productManager.getProductById(productId);
    if (!product) return;
    
    const modalContent = `
        <div class="quick-view-modal">
            <div class="quick-view-images">
                <img src="${product.images[0]}" alt="${product.name}">
            </div>
            <div class="quick-view-info">
                <h2>${product.name}</h2>
                <p>${product.description}</p>
                <div class="price">${cart.formatPrice(product.price)}</div>
                <button class="btn-primary" onclick="addToProductCart(${product.id}); uiManager.showModal('')">
                    Ajouter au panier
                </button>
            </div>
        </div>
    `;
    
    uiManager.showModal(modalContent);
}

// Générer étoiles
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Obtenir couleur hex
function getColorHex(color) {
    const colors = {
        'Bleu': '#3498db',
        'Blanc': '#ffffff',
        'Noir': '#000000',
        'Rouge': '#e74c3c',
        'Gris': '#95a5a6',
        'Marron': '#795548',
        'Beige': '#f5deb3',
        'Or': '#f1c40f'
    };
    return colors[color] || '#3498db';
}

// Ajouter styles animations
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Animations */
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes fadeInUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-in {
            animation: fadeInUp 0.6s ease forwards;
        }
        
        /* Notification */
        .notification {
            animation: slideIn 0.3s ease;
        }
        
        .notification.slide-out {
            animation: slideOut 0.3s ease;
        }
        
        /* Dark theme */
        .dark-theme {
            background: #1a1a1a;
            color: #ffffff;
        }
        
        .dark-theme .product-card {
            background: #2d2d2d;
        }
        
        /* Mobile menu */
        @media (max-width: 768px) {
            .main-nav {
                display: none;
            }
            
            .main-nav.show {
                display: flex;
                flex-direction: column;
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                z-index: 1000;
            }
        }
    `;
    document.head.appendChild(style);
}

// ==============================================
// Export pour utilisation globale
// ==============================================

// Fonctions globales accessibles depuis HTML
window.addToCart = (productId) => {
    const product = productManager.getProductById(productId);
    if (product) {
        cart.addProduct({
            ...product,
            quantity: 1,
            size: 'M',
            color: product.colors[0]
        });
    }
};

window.clearCart = () => cart.clearCart();
window.showQuickView = showQuickView;
window.formatDate = formatDate;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.smoothScroll = smoothScroll;

console.log('✅ TunisieVêtements - Script principal chargé');