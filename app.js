// Session Management and Login Handler for GenTri's Best

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // ============================================
    // LOGIN PAGE FUNCTIONALITY
    // ============================================
    if (loginForm) {
        // Find the submit button
        const submitBtn = document.getElementById('loginButton');
        
        // Handle password visibility toggle
        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const passwordInput = document.getElementById('password');
                const toggleIcon = document.getElementById('togglePasswordIcon');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    toggleIcon.classList.remove('fa-eye');
                    toggleIcon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    toggleIcon.classList.remove('fa-eye-slash');
                    toggleIcon.classList.add('fa-eye');
                }
            });
        }

        // Handle login form submission
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                handleLogin();
            });
        }
    }

    // ============================================
    // DASHBOARD PAGE FUNCTIONALITY
    // ============================================
    if (document.getElementById('userNameDisplay')) {
        // We're on the dashboard page
        checkSessionAndLoadUserData();
        
        // Load browse products on dashboard load
        loadBrowseProducts();
        
        // Setup inventory form listener
        const addProductForm = document.getElementById('addProductForm');
        if (addProductForm) {
            addProductForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleAddProduct();
            });
        }
    }

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }
});

// ============================================
// LOGIN FUNCTION
// ============================================
function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorBox = document.getElementById('errorBox');
    const errorText = document.getElementById('errorText');

    // Validate inputs
    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }

    // Disable button during request
    const submitBtn = document.getElementById('loginButton');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Logging in...';

    // Send login request
    fetch('login.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        credentials: 'include', // Include cookies for session
        body: 'username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password)
    })
    .then(response => {
        console.log('Login response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Login response data:', data);
        if (data.success) {
            console.log('Login successful, fetching user data...');
            // Store username in sessionStorage as backup
            sessionStorage.setItem('username', username);
            
            // Fetch user data right after login to verify session
            fetch('get_user_data.php', {
                method: 'GET',
                credentials: 'include'
            })
            .then(response => response.json())
            .then(userData => {
                console.log('User data received:', userData);
                if (userData.authenticated) {
                    // Store user data
                    sessionStorage.setItem('userData', JSON.stringify(userData));
                    console.log('Redirecting to dashboard...');
                    window.location.href = 'GenTrisBest_Dashboard.html';
                } else {
                    const errorMsg = userData.error || 'Failed to retrieve user data';
                    console.error('User data error:', userData);
                    showError(errorMsg);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                    sessionStorage.removeItem('username');
                }
            })
            .catch(err => {
                console.error('Error fetching user data:', err);
                showError('Error verifying login - ' + err.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                sessionStorage.removeItem('username');
            });
        } else {
            showError(data.error || 'Login failed');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showError('An error occurred during login. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// ============================================
// SESSION CHECK AND USER DATA LOADING
// ============================================
function checkSessionAndLoadUserData() {
    console.log('Checking session...');
    
    // First check if we have cached user data from login
    const cachedUserData = sessionStorage.getItem('userData');
    if (cachedUserData) {
        console.log('Found cached user data, using it...');
        try {
            const userData = JSON.parse(cachedUserData);
            displayUserData(userData);
            return;
        } catch (e) {
            console.error('Error parsing cached user data:', e);
        }
    }
    
    // If no cache, try to get session from server
    fetch('session_check.php', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        console.log('Session check response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Session check data:', data);
        if (data.authenticated) {
            console.log('User authenticated via PHP session');
            // Cache the data
            sessionStorage.setItem('userData', JSON.stringify(data));
            displayUserData(data);
        } else {
            // No session found, redirect to login
            console.log('No session found, redirecting to login');
            clearSessionData();
            window.location.href = 'GenTrisBest_Login.html';
        }
    })
    .catch(error => {
        console.error('Session check error:', error);
        clearSessionData();
        window.location.href = 'GenTrisBest_Login.html';
    });
}

function clearSessionData() {
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userData');
}

// ============================================
// DISPLAY USER DATA ON DASHBOARD
// ============================================
function displayUserData(userData) {
    // Store user data globally for access in other functions
    window.currentUser = userData;
    
    // Update welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const firstName = userData.firstName || userData.username;
        welcomeMessage.textContent = `Welcome back, ${firstName}!`;
    }

    // Update user initials
    const userInitials = document.getElementById('userInitials');
    if (userInitials && userData.firstName && userData.lastName) {
        const initials = (userData.firstName.charAt(0) + userData.lastName.charAt(0)).toUpperCase();
        userInitials.textContent = initials;
    } else if (userInitials) {
        userInitials.textContent = userData.username.substring(0, 2).toUpperCase();
    }

    // Update username display
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        const fullName = userData.lastName
            ? `${userData.firstName} ${userData.lastName}`
            : userData.username;
        userNameDisplay.textContent = fullName;
    }

    // Update user role display (use accountType)
    const userRoleDisplay = document.getElementById('userRoleDisplay');
    if (userRoleDisplay) {
        const accountType = userData.accountType || 'USER';
        userRoleDisplay.textContent = accountType;
        userRoleDisplay.className = 'badge text-uppercase mt-1';
        
        switch(accountType) {
            case 'ADMIN':
                userRoleDisplay.classList.add('bg-danger');
                break;
            case 'INVENTORY':
                userRoleDisplay.classList.add('bg-warning');
                break;
            case 'MANAGER':
                userRoleDisplay.classList.add('bg-info');
                break;
            default:
                userRoleDisplay.classList.add('bg-success');
        }
    }

    // Show admin tab if user is admin
    if (userData.accountType === 'ADMIN') {
        const adminTab = document.getElementById('adminNavItem');
        if (adminTab) {
            adminTab.style.display = 'block';
        }
    }

    // Show inventory tab if user has inventory access (ADMIN, INVENTORY, MANAGER)
    const inventoryRoles = ['ADMIN', 'INVENTORY', 'MANAGER'];
    if (inventoryRoles.includes(userData.accountType)) {
        const inventoryTab = document.getElementById('inventoryNavItem');
        if (inventoryTab) {
            inventoryTab.style.display = 'block';
        }
    }
}

// ============================================
// LOGOUT FUNCTION
// ============================================
function logout() {
        // Clear session data
        clearSessionData();
        // Navigate to logout.php which will show alert and redirect
        window.location.href = 'logout.php';
    }


// ============================================
// HELPER FUNCTIONS
// ============================================
function showError(message) {
    const errorBox = document.getElementById('errorBox');
    const errorText = document.getElementById('errorText');
    
    if (errorBox && errorText) {
        errorText.textContent = message;
        errorBox.classList.remove('d-none');
        errorBox.classList.add('d-flex');
    }
}

// ============================================
// MODAL HELPER FUNCTIONS
// ============================================
function showModal(title, message, headerBg = 'bg-info', footerButtons = []) {
    const modal = document.getElementById('adminModal');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    // Set header background color
    modalHeader.className = `modal-header ${headerBg} text-white`;
    
    // Set title and content
    modalTitle.textContent = title;
    modalBody.innerHTML = message;
    
    // Set footer buttons
    if (footerButtons.length === 0) {
        modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
    } else {
        modalFooter.innerHTML = '';
        footerButtons.forEach(btn => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = btn.class || 'btn btn-secondary';
            button.textContent = btn.text;
            if (btn.onclick) {
                button.onclick = btn.onclick;
            }
            if (btn.dataDismiss) {
                button.setAttribute('data-bs-dismiss', 'modal');
            }
            modalFooter.appendChild(button);
        });
    }
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
function loadAllUsers() {
    fetch('admin_api.php?action=get_all_users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayUsersTable(data.users);
            } else {
                showModal('Error', `Failed to load users: ${data.error}`, 'bg-danger', [
                    {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
                ]);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showModal('Error', 'Failed to load users', 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        });
}

function displayUsersTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const isCurrentUser = user.Username === window.currentUser.username;
        
        row.innerHTML = `
            <td><strong>${user.FirstName} ${user.LastName}</strong></td>
            <td>${user.Username}</td>
            <td>${user.Email}</td>
            <td>${user.ContactNumber}</td>
            <td>
                <select class="form-select form-select-sm" id="type_${user.Username}" onchange="updateAccountType('${user.Username}', this.value)" ${isCurrentUser ? 'disabled' : ''}>
                    <option value="USER" ${user.AccountType === 'USER' ? 'selected' : ''}>USER</option>
                    <option value="ADMIN" ${user.AccountType === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                    <option value="INVENTORY" ${user.AccountType === 'INVENTORY' ? 'selected' : ''}>INVENTORY</option>
                    <option value="MANAGER" ${user.AccountType === 'MANAGER' ? 'selected' : ''}>MANAGER</option>
                </select>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-warning" onclick="resetPassword('${user.Username}', '${user.FirstName} ${user.LastName}')">
                        <i class="fa-solid fa-key me-1"></i>Reset
                    </button>
                    <button class="btn btn-danger" onclick="deleteUser('${user.Username}')" ${isCurrentUser ? 'disabled' : ''}>
                        <i class="fa-solid fa-trash me-1"></i>Delete
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateAccountType(username, accountType) {
    // Show confirmation modal
    showModal(
        'Change Account Type',
        `<p class="mb-0"><strong>Update account type for:</strong> ${username}</p>
        <p class="mt-2 mb-0"><strong>New Type:</strong> ${accountType}</p>`,
        'bg-info',
        [
            {text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true, onclick: loadAllUsers},
            {text: 'Update', class: 'btn btn-info', onclick: () => performUpdateAccountType(username, accountType)}
        ]
    );
}

function performUpdateAccountType(username, accountType) {
    // Hide current modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
    if (modal) modal.hide();
    
    const formData = new FormData();
    formData.append('action', 'update_account_type');
    formData.append('username', username);
    formData.append('account_type', accountType);
    
    fetch('admin_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showModal(
                'Success',
                `<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>${data.message}</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadAllUsers, 500)}]
            );
        } else {
            showModal('Error', `Failed to update: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true, onclick: () => setTimeout(loadAllUsers, 500)}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to update account type', 'bg-danger', [
            {text: 'Ok', class: 'btn btn-danger', dataDismiss: true, onclick: () => setTimeout(loadAllUsers, 500)}
        ]);
    });
}

function deleteUser(username) {
    // Show confirmation modal
    showModal(
        'Delete User',
        `<p class="mb-3"><strong>Are you sure you want to delete this user?</strong></p>
        <p class="mb-0"><strong>Username:</strong> ${username}</p>
        <div class="alert alert-danger mt-3 mb-0">
            <i class="fa-solid fa-exclamation-triangle me-2"></i>
            This action cannot be undone!
        </div>`,
        'bg-danger',
        [
            {text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true},
            {text: 'Delete User', class: 'btn btn-danger', onclick: () => performDeleteUser(username)}
        ]
    );
}

function performDeleteUser(username) {
    // Hide current modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
    if (modal) modal.hide();
    
    const formData = new FormData();
    formData.append('action', 'delete_user');
    formData.append('username', username);
    
    fetch('admin_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showModal(
                'Success',
                `<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>User deleted successfully!</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadAllUsers, 500)}]
            );
        } else {
            showModal('Error', `Failed to delete user: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to delete user', 'bg-danger', [
            {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
        ]);
    });
}

function resetPassword(username, fullName) {
    // Show modal with password input
    const modal = document.getElementById('adminModal');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    // Set header
    modalHeader.className = 'modal-header bg-warning text-dark';
    modalTitle.textContent = 'Reset Password';
    
    // Create form content
    modalBody.innerHTML = `
        <form id="resetPasswordForm">
            <p class="mb-3"><strong>Reset password for:</strong> ${fullName} (${username})</p>
            <div class="mb-3">
                <label for="newPassword" class="form-label">New Password</label>
                <input type="text" class="form-control" id="newPassword" placeholder="Leave blank to generate random password">
                <small class="text-muted">Minimum 4 characters. Leave blank to auto-generate secure password.</small>
            </div>
        </form>
    `;
    
    // Set footer buttons
    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-warning" id="confirmResetBtn">Reset Password</button>
    `;
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Handle reset button click
    document.getElementById('confirmResetBtn').onclick = function() {
        const passwordInput = document.getElementById('newPassword').value;
        const password = passwordInput.trim() === '' ? generateRandomPassword() : passwordInput.trim();
        
        // Validate
        if (password.length < 4) {
            showModal('Error', 'Password must be at least 4 characters', 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
            return;
        }
        
        // Hide current modal
        bootstrapModal.hide();
        
        // Show confirmation modal
        setTimeout(() => {
            document.getElementById('modalHeader').className = 'modal-header bg-warning text-dark';
            document.getElementById('adminModalLabel').textContent = 'Confirm Password Reset';
            document.getElementById('modalBody').innerHTML = `
                <p><strong>Reset password for:</strong> ${fullName}</p>
                <p><strong>New Password:</strong></p>
                <div class="alert alert-info"><code>${password}</code></div>
                <p class="small text-muted">Please share this password securely with the user.</p>
            `;
            document.getElementById('modalFooter').innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-warning" id="confirmFinalBtn">Confirm & Reset</button>
            `;
            
            const confirmModal = new bootstrap.Modal(document.getElementById('adminModal'));
            confirmModal.show();
            
            // Handle final confirmation
            document.getElementById('confirmFinalBtn').onclick = function() {
                confirmModal.hide();
                performPasswordReset(username, password);
            };
        }, 300);
    };
}

function performPasswordReset(username, password) {
    const formData = new FormData();
    formData.append('action', 'reset_password');
    formData.append('username', username);
    formData.append('new_password', password);
    
    fetch('admin_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showModal(
                'Success', 
                `<p class="mb-2"><i class="fa-solid fa-check-circle text-success me-2"></i>Password reset successfully!</p>
                <p class="mb-3"><strong>Username:</strong> ${username}</p>
                <p class="mb-0"><strong>New Password:</strong> <code>${password}</code></p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadAllUsers, 500)}]
            );
        } else {
            showModal('Error', `Failed to reset password: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to reset password', 'bg-danger', [
            {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
        ]);
    });
}

function generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// ============================================
// CUSTOMER FUNCTIONS - BROWSE & ORDER PRODUCTS
// ============================================
let allBrowseProducts = [];
let browseProductsFiltered = [];

function loadBrowseProducts() {
    fetch('customer_api.php?action=get_available_products')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allBrowseProducts = data.products;
                browseProductsFiltered = data.products;
                displayBrowseProducts(data.products);
                setupBrowseSearchListener();
            } else {
                showModal('Error', `Failed to load products: ${data.error}`, 'bg-danger', [
                    {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
                ]);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showModal('Error', 'Failed to load products', 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        });
}

function displayBrowseProducts(products) {
    const container = document.getElementById('browseProductsContainer');
    const productCount = document.getElementById('browseProductCount');
    
    if (!container) return;
    
    container.innerHTML = '';
    productCount.textContent = `${products.length} available`;
    
    if (products.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="fa-solid fa-inbox me-2"></i>No products available</div>';
        return;
    }
    
    products.forEach(product => {
        const isOutOfStock = product.Quantity <= 0;
        const stockClass = product.Quantity <= 5 ? 'text-danger' : 'text-success';
        
        const productCard = document.createElement('div');
        productCard.className = 'col-md-4 mb-4';
        productCard.innerHTML = `
            <div class="card border-0 shadow-sm h-100 ${isOutOfStock ? 'opacity-75' : ''}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title fw-bold">${product.ProductName}</h6>
                        <span class="badge ${product.Quantity > 0 ? 'bg-success' : 'bg-danger'}">
                            ${product.Status}
                        </span>
                    </div>
                    <p class="text-muted small mb-2">${product.Description || 'No description'}</p>
                    <p class="text-muted small"><strong>Category:</strong> ${product.Category || 'N/A'}</p>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="h5 mb-0 text-sky fw-bold">₱${parseFloat(product.Price).toFixed(2)}</span>
                        <span class="${stockClass} fw-bold">${product.Quantity} in stock</span>
                    </div>
                    ${isOutOfStock ? 
                        '<button class="btn btn-secondary w-100" disabled><i class="fa-solid fa-times me-2"></i>Out of Stock</button>' :
                        `<button class="btn btn-sky w-100" onclick="showOrderModal(${product.ProductID}, '${product.ProductName}', ${product.Price})">
                            <i class="fa-solid fa-shopping-cart me-2"></i>Order Now
                        </button>`
                    }
                </div>
            </div>
        `;
        container.appendChild(productCard);
    });
}

function showOrderModal(productId, productName, price) {
    const modal = document.getElementById('adminModal');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    // Set header
    modalHeader.className = 'modal-header bg-sky text-white';
    modalTitle.textContent = 'Place Order';
    
    // Create form content
    modalBody.innerHTML = `
        <form id="orderForm">
            <div class="mb-3">
                <h6 class="fw-bold">${productName}</h6>
                <p class="text-muted mb-0">Price per unit: <strong>₱${parseFloat(price).toFixed(2)}</strong></p>
            </div>
            <div class="mb-3">
                <label for="orderQuantity" class="form-label fw-medium">Quantity</label>
                <input type="number" class="form-control" id="orderQuantity" min="1" value="1" required>
            </div>
            <div class="mb-3">
                <label for="orderNotes" class="form-label fw-medium">Order Notes (Optional)</label>
                <textarea class="form-control" id="orderNotes" rows="2" placeholder="Special instructions or notes..."></textarea>
            </div>
            <div id="totalPriceDisplay" class="alert alert-info mb-0">
                <strong>Total Price:</strong> ₱<span id="totalAmount">0.00</span>
            </div>
        </form>
    `;
    
    // Set footer buttons
    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-sky" id="confirmOrderBtn">Place Order</button>
    `;
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Update total price on quantity change
    const quantityInput = document.getElementById('orderQuantity');
    const totalAmount = document.getElementById('totalAmount');
    
    if (quantityInput) {
        quantityInput.addEventListener('input', function() {
            const qty = parseInt(this.value) || 0;
            const total = qty * parseFloat(price);
            totalAmount.textContent = total.toFixed(2);
        });
        
        // Initial calculation
        const qty = parseInt(quantityInput.value) || 1;
        const total = qty * parseFloat(price);
        totalAmount.textContent = total.toFixed(2);
    }
    
    // Handle order confirmation
    document.getElementById('confirmOrderBtn').onclick = function() {
        const quantity = document.getElementById('orderQuantity').value;
        const notes = document.getElementById('orderNotes').value;
        
        if (!quantity || quantity <= 0) {
            showModal('Error', 'Please enter a valid quantity', 'bg-warning', [
                {text: 'Ok', class: 'btn btn-warning', dataDismiss: true}
            ]);
            return;
        }
        
        bootstrapModal.hide();
        performPlaceOrder(productId, quantity, notes);
    };
}

function performPlaceOrder(productId, quantity, notes) {
    const formData = new FormData();
    formData.append('action', 'place_order');
    formData.append('productId', productId);
    formData.append('quantity', quantity);
    formData.append('notes', notes);
    
    fetch('customer_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showModal(
                'Order Placed Successfully',
                `<p class="mb-2"><i class="fa-solid fa-check-circle text-success me-2"></i>Your order has been placed!</p>
                <p class="mb-2"><strong>Order Number:</strong> ${data.orderNumber}</p>
                <p class="mb-0"><strong>Total Amount:</strong> ₱${data.totalPrice}</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => {
                    setTimeout(() => {
                        loadBrowseProducts();
                        loadOrderHistory();
                    }, 300);
                }}]
            );
        } else {
            showModal('Error', `Failed to place order: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to place order', 'bg-danger', [
            {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
        ]);
    });
}

function setupBrowseSearchListener() {
    const searchInput = document.getElementById('searchBrowseProducts');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                browseProductsFiltered = allBrowseProducts;
            } else {
                browseProductsFiltered = allBrowseProducts.filter(product => {
                    const name = (product.ProductName || '').toLowerCase();
                    const category = (product.Category || '').toLowerCase();
                    return name.includes(searchTerm) || category.includes(searchTerm);
                });
            }
            
            displayBrowseProducts(browseProductsFiltered);
        });
    }
}

function loadOrderHistory() {
    fetch('customer_api.php?action=get_order_history')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayOrderHistory(data.orders);
            } else {
                const tableBody = document.getElementById('orderHistoryTableBody');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Error loading order history</td></tr>';
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            const tableBody = document.getElementById('orderHistoryTableBody');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Error loading order history</td></tr>';
            }
        });
}

function displayOrderHistory(orders) {
    const tableBody = document.getElementById('orderHistoryTableBody');
    const orderCount = document.getElementById('orderHistoryCount');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    orderCount.textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''}`;
    
    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fa-solid fa-inbox me-2"></i>No orders yet. Start by browsing our products!</td></tr>';
        return;
    }
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        const orderDate = new Date(order.OrderDate);
        const formattedDate = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        
        const statusBadge = `<span class="badge ${
            order.Status === 'PENDING' ? 'bg-warning' : 
            order.Status === 'CONFIRMED' ? 'bg-info' : 
            order.Status === 'SHIPPED' ? 'bg-primary' : 
            'bg-success'
        }">${order.Status}</span>`;
        
        // Show cancel button only for PENDING orders
        const actionBtn = order.Status === 'PENDING' ? 
            `<button class="btn btn-sm btn-danger" onclick="showCancelOrderModal(${order.OrderID}, '${order.OrderNumber}', ${order.Quantity})">
                <i class="fa-solid fa-times me-1"></i>Cancel
            </button>` : 
            '<span class="text-muted small">N/A</span>';
        
        row.innerHTML = `
            <td><strong>${order.OrderNumber}</strong></td>
            <td>${order.ProductName}</td>
            <td>${order.Quantity}</td>
            <td>₱${parseFloat(order.TotalPrice).toFixed(2)}</td>
            <td>${formattedDate}</td>
            <td>${statusBadge}</td>
            <td>${actionBtn}</td>
        `;
        tableBody.appendChild(row);
    });
}

function showCancelOrderModal(orderId, orderNumber, quantity) {
    showModal(
        'Cancel Order',
        `<p class="mb-3"><strong>Are you sure you want to cancel this order?</strong></p>
        <p class="mb-0"><strong>Order Number:</strong> ${orderNumber}</p>
        <div class="alert alert-warning mt-3 mb-0">
            <i class="fa-solid fa-exclamation-triangle me-2"></i>
            This action will return ${quantity} unit(s) back to inventory.
        </div>`,
        'bg-danger',
        [
            {text: 'Keep Order', class: 'btn btn-secondary', dataDismiss: true},
            {text: 'Cancel Order', class: 'btn btn-danger', onclick: () => performCancelOrder(orderId)}
        ]
    );
}

function performCancelOrder(orderId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
    if (modal) modal.hide();
    
    const formData = new FormData();
    formData.append('action', 'cancel_order');
    formData.append('orderId', orderId);
    
    fetch('customer_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showModal(
                'Order Cancelled',
                `<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>Your order has been cancelled successfully and inventory has been restored.</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => {
                    setTimeout(loadOrderHistory, 300);
                }}]
            );
        } else {
            showModal('Error', `Failed to cancel order: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to cancel order', 'bg-danger', [
            {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
        ]);
    });
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================
function setupSearchListener() {
    const searchInput = document.getElementById('searchProducts');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                // Show all products
                displayProductsTable(allProducts);
                document.getElementById('searchInfo').style.display = 'none';
            } else {
                // Filter products by name and category
                const filteredProducts = allProducts.filter(product => {
                    const name = (product.ProductName || '').toLowerCase();
                    const category = (product.Category || '').toLowerCase();
                    return name.includes(searchTerm) || category.includes(searchTerm);
                });
                
                displayProductsTable(filteredProducts);
                
                // Show search info
                const searchInfo = document.getElementById('searchInfo');
                const searchResultText = document.getElementById('searchResultText');
                searchInfo.style.display = 'block';
                searchResultText.textContent = `"${searchTerm}" (${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''})`;
            }
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('searchProducts');
            searchInput.value = '';
            searchInput.focus();
            displayProductsTable(allProducts);
            document.getElementById('searchInfo').style.display = 'none';
        });
    }
}

// ============================================
// SECTION NAVIGATION
// ============================================
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('[id$="Section"]');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionId + 'Section');
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // Mark corresponding nav link as active
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const onclick = link.getAttribute('onclick');
        if (onclick && onclick.includes(`showSection('${sectionId}')`)) {
            link.classList.add('active');
        }
    });
}

// ============================================
// INVENTORY FUNCTIONS
// ============================================
// Store all products for search functionality
let allProducts = [];

function loadInventory() {
    fetch('inventory_api.php?action=get_all_products')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allProducts = data.products; // Store for search
                displayProductsTable(data.products);
                setupSearchListener();
            } else {
                showModal('Error', `Failed to load products: ${data.error}`, 'bg-danger', [
                    {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
                ]);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showModal('Error', 'Failed to load inventory', 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        });
}

function displayProductsTable(products) {
    const tableBody = document.getElementById('productsTableBody');
    const productCount = document.getElementById('productCount');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    productCount.textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`;
    
    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><i class="fa-solid fa-inbox me-2"></i>No products found. Add your first product to get started!</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        const quantityClass = product.Quantity <= 5 ? 'text-danger fw-bold' : 'text-success';
        
        row.innerHTML = `
            <td><strong>${product.ProductName}</strong></td>
            <td>${product.Category || 'N/A'}</td>
            <td>₱${parseFloat(product.Price).toFixed(2)}</td>
            <td class="${quantityClass}">${product.Quantity} units</td>
            <td>
                <span class="badge ${product.Status === 'ACTIVE' ? 'bg-success' : 'bg-warning'}">
                    ${product.Status}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-info" onclick="editProduct(${product.ProductID}, '${product.ProductName}', '${product.Category || ''}', '${product.Description || ''}', ${product.Price}, ${product.Quantity})">
                        <i class="fa-solid fa-edit me-1"></i>Edit
                    </button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.ProductID}, '${product.ProductName}')">
                        <i class="fa-solid fa-trash me-1"></i>Delete
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function handleAddProduct() {
    const productName = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const price = document.getElementById('productPrice').value;
    const quantity = document.getElementById('productQuantity').value;
    
    // Validate inputs
    if (!productName || !price || quantity === '') {
        showModal('Validation Error', 'Please fill in all required fields: Product Name, Price, and Quantity', 'bg-warning', [
            {text: 'Ok', class: 'btn btn-warning', dataDismiss: true}
        ]);
        return;
    }
    
    const formData = new FormData();
    formData.append('action', 'add_product');
    formData.append('productName', productName);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('quantity', quantity);
    
    fetch('inventory_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showModal(
                'Success',
                `<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>${data.message}</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => {
                    document.getElementById('addProductForm').reset();
                    setTimeout(loadInventory, 500);
                }}]
            );
        } else {
            showModal('Error', `Failed to add product: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to add product', 'bg-danger', [
            {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
        ]);
    });
}

function editProduct(productId, productName, category, description, price, quantity) {
    const modal = document.getElementById('adminModal');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    // Set header
    modalHeader.className = 'modal-header bg-info text-white';
    modalTitle.textContent = 'Edit Product';
    
    // Create form content
    modalBody.innerHTML = `
        <form id="editProductForm">
            <div class="mb-3">
                <label for="editProductName" class="form-label fw-medium">Product Name</label>
                <input type="text" class="form-control" id="editProductName" value="${productName}" required>
            </div>
            <div class="mb-3">
                <label for="editProductCategory" class="form-label fw-medium">Category</label>
                <input type="text" class="form-control" id="editProductCategory" value="${category}">
            </div>
            <div class="mb-3">
                <label for="editProductDescription" class="form-label fw-medium">Description</label>
                <textarea class="form-control" id="editProductDescription" rows="2">${description}</textarea>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="editProductPrice" class="form-label fw-medium">Price</label>
                    <input type="number" class="form-control" id="editProductPrice" value="${price}" step="0.01" required>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="editProductQuantity" class="form-label fw-medium">Quantity</label>
                    <input type="number" class="form-control" id="editProductQuantity" value="${quantity}" required>
                </div>
            </div>
        </form>
    `;
    
    // Set footer buttons
    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-info" id="confirmEditBtn">Save Changes</button>
    `;
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Handle edit button click
    document.getElementById('confirmEditBtn').onclick = function() {
        const editedName = document.getElementById('editProductName').value.trim();
        const editedCategory = document.getElementById('editProductCategory').value.trim();
        const editedDescription = document.getElementById('editProductDescription').value.trim();
        const editedPrice = document.getElementById('editProductPrice').value;
        const editedQuantity = document.getElementById('editProductQuantity').value;
        
        if (!editedName || !editedPrice || editedQuantity === '') {
            showModal('Validation Error', 'Please fill in all required fields', 'bg-warning', [
                {text: 'Ok', class: 'btn btn-warning', dataDismiss: true}
            ]);
            return;
        }
        
        bootstrapModal.hide();
        performUpdateProduct(productId, editedName, editedCategory, editedDescription, editedPrice, editedQuantity);
    };
}

function performUpdateProduct(productId, productName, category, description, price, quantity) {
    const formData = new FormData();
    formData.append('action', 'update_product');
    formData.append('productId', productId);
    formData.append('productName', productName);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('quantity', quantity);
    
    fetch('inventory_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showModal(
                'Success',
                `<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>${data.message}</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadInventory, 500)}]
            );
        } else {
            showModal('Error', `Failed to update product: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to update product', 'bg-danger', [
            {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
        ]);
    });
}

function deleteProduct(productId, productName) {
    showModal(
        'Delete Product',
        `<p class="mb-3"><strong>Are you sure you want to delete this product?</strong></p>
        <p class="mb-0"><strong>Product Name:</strong> ${productName}</p>
        <div class="alert alert-danger mt-3 mb-0">
            <i class="fa-solid fa-exclamation-triangle me-2"></i>
            This action cannot be undone!
        </div>`,
        'bg-danger',
        [
            {text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true},
            {text: 'Delete Product', class: 'btn btn-danger', onclick: () => performDeleteProduct(productId)}
        ]
    );
}

function performDeleteProduct(productId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
    if (modal) modal.hide();
    
    const formData = new FormData();
    formData.append('action', 'delete_product');
    formData.append('productId', productId);
    
    fetch('inventory_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showModal(
                'Success',
                `<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>Product deleted successfully!</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadInventory, 500)}]
            );
        } else {
            showModal('Error', `Failed to delete product: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to delete product', 'bg-danger', [
            {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
        ]);
    });
}
