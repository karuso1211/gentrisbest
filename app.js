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

        // Handle login form submission (button click or Enter key)
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
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
        
        // Setup idle timeout for auto logout after 3 minutes of inactivity
        setupIdleTimeout();
        
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
        } else if (data.isGuest) {
            // Allow guest access
            console.log('Guest user accessing dashboard');
            // Cache the guest data
            sessionStorage.setItem('userData', JSON.stringify(data));
            displayUserData(data);
        } else {
            // No session and not a guest - redirect to login
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
    const isGuest = userData.accountType === 'GUEST' || userData.isGuest;
    
    // Update welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const firstName = userData.firstName || userData.username;
        if (isGuest) {
            welcomeMessage.textContent = `Welcome to Dairy Box GenTri!`;
        } else {
            welcomeMessage.textContent = `Welcome, ${firstName}!`;
        }
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
        if (isGuest) {
            userNameDisplay.textContent = 'Guest User';
        } else {
            const fullName = userData.lastName
                ? `${userData.firstName} ${userData.lastName}`
                : userData.username;
            userNameDisplay.textContent = fullName;
        }
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
            case 'FRONT DESK':
                userRoleDisplay.classList.add('bg-primary');
                break;
            case 'GUEST':
                userRoleDisplay.classList.add('bg-secondary');
                break;
            default:
                userRoleDisplay.classList.add('bg-success');
        }
    }

    // Handle tab visibility based on user type
    // Get navigation items using IDs
    const reportsNavItem = document.getElementById('reportsNavItem');
    const analyticsNavItem = document.getElementById('analyticsNavItem');
    const inventoryTab = document.getElementById('inventoryNavItem');
    const adminTab = document.getElementById('adminNavItem');
    const posTab = document.getElementById('posNavItem');
    const cartNavItem = document.getElementById('cartNavItem');

    if (isGuest) {
        // Hide all restricted tabs for guests
        if (reportsNavItem) reportsNavItem.style.display = 'none';
        if (analyticsNavItem) analyticsNavItem.style.display = 'none';
        if (inventoryTab) inventoryTab.style.display = 'none';
        if (adminTab) adminTab.style.display = 'none';
        if (posTab) posTab.style.display = 'none';
        if (cartNavItem) cartNavItem.style.display = 'none';
    } else {
        // Show tabs for authenticated users based on their role
        // Reports tab is visible only to ADMIN, INVENTORY, MANAGER
        const reportRoles = ['ADMIN', 'MANAGER'];
        if (reportRoles.includes(userData.accountType)) {
            if (reportsNavItem) reportsNavItem.style.display = 'block';
        } else {
            if (reportsNavItem) reportsNavItem.style.display = 'none';
        }
        
        if (analyticsNavItem) analyticsNavItem.style.display = 'block';
        
        // Show admin tab if user is admin
        if (userData.accountType === 'ADMIN') {
            if (adminTab) adminTab.style.display = 'block';
        }

        // Show inventory tab if user has inventory access (ADMIN, INVENTORY, MANAGER, FRONT DESK)
        const inventoryRoles = ['ADMIN', 'INVENTORY', 'MANAGER', 'FRONT DESK'];
        if (inventoryRoles.includes(userData.accountType)) {
            if (inventoryTab) inventoryTab.style.display = 'block';
        }
        
        // Show POS tab if user is FRONT DESK
        if (userData.accountType === 'FRONT DESK') {
            if (posTab) posTab.style.display = 'block';
        } else {
            if (posTab) posTab.style.display = 'none';
        }

        // Show Cart tab only for regular users (USER role)
        if (userData.accountType === 'USER') {
            if (cartNavItem) cartNavItem.style.display = 'block';
        } else {
            if (cartNavItem) cartNavItem.style.display = 'none';
        }
    }
    
    // Update logout button for guests
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        if (isGuest) {
            logoutBtn.textContent = '';
            logoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket me-2"></i> Login';
            logoutBtn.className = 'btn btn-outline-primary w-100 d-flex align-items-center justify-content-center fw-medium shadow-sm';
            logoutBtn.onclick = function() {
                window.location.href = 'GenTrisBest_Login.html';
            };
        } else {
            logoutBtn.className = 'btn btn-outline-danger w-100 d-flex align-items-center justify-content-center fw-medium shadow-sm';
            logoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket me-2"></i> Logout';
            logoutBtn.onclick = null; // Reset to default handler
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
// IDLE TIMEOUT - AUTO LOGOUT AFTER 3 MINUTES
// ============================================
let idleTimeoutId = null;
const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes in milliseconds

function resetIdleTimeout() {
    // Clear existing timeout
    if (idleTimeoutId) {
        clearTimeout(idleTimeoutId);
    }
    
    // Set new timeout - log out if no activity for 3 minutes
    idleTimeoutId = setTimeout(function() {
        console.log('User idle for 3 minutes, logging out...');
        showError('Your session has expired due to inactivity. You have been logged out.');
        setTimeout(function() {
            logout();
        }, 2000); // Give user time to see the message
    }, IDLE_TIMEOUT_MS);
}

function setupIdleTimeout() {
    // Only setup idle timeout on dashboard (authenticated users)
    if (!document.getElementById('userNameDisplay')) {
        return;
    }
    
    // List of events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Add event listeners for each activity type
    events.forEach(event => {
        document.addEventListener(event, function() {
            // Only reset if user is authenticated (not a guest)
            if (window.currentUser && window.currentUser.accountType !== 'GUEST') {
                resetIdleTimeout();
            }
        }, true);
    });
    
    // Start the initial timeout
    resetIdleTimeout();
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
    
    // Close any existing modal instance first
    const existingModal = bootstrap.Modal.getInstance(modal);
    if (existingModal) {
        existingModal.hide();
        existingModal.dispose();
    }
    
    // Clean up all backdrops and modal-open class
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto'; // Restore scrolling
    
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
    const bootstrapModal = new bootstrap.Modal(modal, {
        backdrop: 'static',
        keyboard: false
    });
    bootstrapModal.show();
    
    // Add listener to clean up when modal is hidden
    modal.addEventListener('hidden.bs.modal', function() {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    }, { once: true });
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
                    <option value="FRONT DESK" ${user.AccountType === 'FRONT DESK' ? 'selected' : ''}>FRONT DESK</option>
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
    // Load products directly (no need to track order history for quantity-based wholesale)
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
    
    // Count only products that are in stock (Quantity > 0)
    const availableProducts = products.filter(p => p.Quantity > 0);
    productCount.textContent = `${availableProducts.length} available`;
    
    if (products.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="fa-solid fa-inbox me-2"></i>No products available</div>';
        return;
    }

    // Check if current user is a guest
    const isGuest = window.currentUser && (window.currentUser.accountType === 'GUEST' || window.currentUser.isGuest);
    
    products.forEach(product => {
        const isOutOfStock = product.Quantity <= 0;
        const stockClass = product.Quantity <= 5 ? 'text-danger' : 'text-success';
        
        // Show pricing with wholesale availability info
        let priceDisplay = '';
        const regularPrice = parseFloat(product.Price);
        const hasWholesale = product.WholesalePrice && parseFloat(product.WholesalePrice) > 0;
        
        // Stock indicator
        const stockIndicator = `
            <div class="mt-2 p-2 rounded" style="background-color: ${product.Quantity > 5 ? '#d4edda' : '#fff3cd'}; border-left: 4px solid ${product.Quantity > 5 ? '#28a745' : '#ffc107'};">
                <small class="fw-bold" style="color: ${product.Quantity > 5 ? '#155724' : '#856404'};">
                    <i class="fa-solid ${product.Quantity > 5 ? 'fa-check-circle' : 'fa-exclamation-circle'} me-1"></i>
                    ${product.Quantity} unit${product.Quantity !== 1 ? 's' : ''} in stock
                </small>
            </div>
        `;
        
        if (hasWholesale) {
            const wholesalePrice = parseFloat(product.WholesalePrice);
            priceDisplay = `
                <div class="d-flex justify-content-between align-items-center mb-2 pt-2 border-top">
                    <div>
                        <div class="small text-muted mb-1">Regular: <del>₱${regularPrice.toFixed(2)}</del></div>
                        <span class="h5 mb-0 text-success fw-bold">₱${wholesalePrice.toFixed(2)}</span>
                    </div>
                    <span class="badge bg-success">
                        <i class="fa-solid fa-tag me-1"></i>Wholesale Available
                    </span>
                </div>
                <p class="text-muted small mb-2"><i class="fa-solid fa-info-circle me-1"></i>Buy 10+ units to unlock wholesale pricing</p>
                ${stockIndicator}
            `;
        } else {
            priceDisplay = `
                <div class="d-flex justify-content-between align-items-center mb-2 pt-2 border-top">
                    <span class="h5 mb-0 text-sky fw-bold">
                        ₱${regularPrice.toFixed(2)}
                    </span>
                </div>
                ${stockIndicator}
            `;
        }
        
        let eligibilityHint = '';
        
        const productCard = document.createElement('div');
        productCard.className = 'col-md-4 mb-4';
        productCard.innerHTML = `
            <div class="card border-0 shadow-sm h-100 ${isOutOfStock ? 'opacity-75' : ''}">
                <div class="card-body product-card-body d-flex flex-column h-100">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title fw-bold">${product.ProductName}</h6>
                        <span class="badge ${product.Quantity > 0 ? 'bg-success' : 'bg-danger'}">
                            ${product.Status}
                        </span>
                    </div>
                    <p class="text-muted small mb-2">${product.Description || 'No description'}</p>
                    <p class="text-muted small">
                        <strong>Category:</strong> ${product.Category || 'N/A'}
                    </p>

                    <!-- This pushes everything below to the bottom -->
                    <div class="mt-auto">
                        ${priceDisplay}
                        ${eligibilityHint}

                        <div class="product-button-wrapper mt-2">
                            ${isOutOfStock ? 
                                '<button class="btn btn-secondary w-100" disabled><i class="fa-solid fa-times me-2"></i>Out of Stock</button>' :
                                isGuest ?
                                '<button class="btn btn-outline-sky w-100" disabled title="Please login to order"><i class="fa-solid fa-lock me-2"></i>Login to Order</button>' :
                                `<button class="btn btn-sky w-100 btn-order-fixed" onclick="showAddToCartModal(${product.ProductID})">
                                    <i class="fa-solid fa-cart-plus me-2"></i>Add to Cart
                                </button>`
                            }
                        </div>
                    </div>

                </div>
            </div>
        `;
        container.appendChild(productCard);
    });
}

// Store pin: Purok 1, Barangay Santiago, General Trias, Cavite, Philippines
const STORE_LAT = 14.3861207;
const STORE_LNG = 120.8802855;

// Lalamove motorcycle rate (Philippines): ₱79 base (first 5 km) + ₱12/km after
const LALAMOVE_BASE_FARE = 79;
const LALAMOVE_BASE_KM = 5;
const LALAMOVE_PER_KM = 12;
// Road distance is typically ~1.3x straight-line (haversine) distance
const ROAD_FACTOR = 1.3;

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcLalamoveFee(km) {
    if (km <= LALAMOVE_BASE_KM) return LALAMOVE_BASE_FARE;
    return LALAMOVE_BASE_FARE + Math.ceil(km - LALAMOVE_BASE_KM) * LALAMOVE_PER_KM;
}

async function geocodeAddress(address) {
    const query = encodeURIComponent(address + ', Philippines');
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=ph`;
    try {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
        }
    } catch (_) {}
    return null;
}

function showOrderModal(productId, productName, price, wholesalePrice) {
    const modal = document.getElementById('adminModal');
    const modalDialog = document.getElementById('adminModalDialog');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');

    // Make wider for the map
    modalDialog.className = 'modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable';

    const regularPrice = parseFloat(price);
    const wholesale = wholesalePrice && parseFloat(wholesalePrice) > 0 ? parseFloat(wholesalePrice) : null;

    modalHeader.className = 'modal-header bg-sky text-white';
    modalTitle.textContent = 'Place Order';

    modalBody.innerHTML = `
        <form id="orderForm">
            <div class="mb-3">
                <h6 class="fw-bold">${productName}</h6>
                <div id="priceInfo" class="mb-3"></div>
            </div>
            <div class="mb-3">
                <label for="orderQuantity" class="form-label fw-medium">Quantity</label>
                <input type="number" class="form-control" id="orderQuantity" min="1" value="1" required>
            </div>

            <hr class="my-3">
            <h6 class="fw-semibold mb-2"><i class="fa-solid fa-truck me-2 text-sky"></i>Delivery Details</h6>

            <div class="mb-2">
                <label for="deliveryAddress" class="form-label fw-medium">
                    Delivery Address <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                    <input type="text" class="form-control" id="deliveryAddress"
                        placeholder="Type address or use map / GPS below" required autocomplete="off">
                    <span class="input-group-text bg-white" id="geocodeStatus">
                        <i class="fa-solid fa-location-dot text-muted"></i>
                    </span>
                </div>
                <small id="geocodeHint" class="text-muted">
                    Type your address, or use the buttons below to set your location.
                </small>
            </div>

            <div class="d-flex gap-2 mb-3">
                <button type="button" class="btn btn-outline-primary btn-sm" id="toggleMapBtn">
                    <i class="fa-solid fa-map-location-dot me-1"></i>Pin on Map
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" id="useGpsBtn">
                    <i class="fa-solid fa-crosshairs me-1"></i>Use My Location
                </button>
            </div>

            <div id="mapPickerSection" style="display:none;" class="mb-3">
                <div id="deliveryMap" style="height:300px; border-radius:8px; border:1px solid #dee2e6; z-index:0;"></div>
                <small class="text-muted mt-1 d-block">
                    <i class="fa-solid fa-hand-pointer me-1"></i>Click anywhere on the map or drag the
                    <span style="color:#e74c3c;">&#x25CF;</span> pin to set your delivery location.
                    <span style="color:#0ea5e9;">&#x25CF;</span> = store.
                </small>
            </div>

            <div id="deliveryFeeBreakdown" class="alert alert-secondary py-2 mb-3" style="display:none;">
                <div class="d-flex justify-content-between small mb-1 text-muted">
                    <span><i class="fa-solid fa-route me-1"></i>Estimated road distance</span>
                    <span id="breakdownDistance">—</span>
                </div>
                <div class="d-flex justify-content-between small mb-1">
                    <span>Product Subtotal</span>
                    <span>₱<span id="breakdownSubtotal">0.00</span></span>
                </div>
                <div class="d-flex justify-content-between small mb-1">
                    <span><i class="fa-solid fa-motorcycle me-1 text-sky"></i>Delivery Fee (Lalamove)</span>
                    <span>₱<span id="breakdownDelivery">0.00</span></span>
                </div>
                <hr class="my-1">
                <div class="d-flex justify-content-between fw-bold">
                    <span>Grand Total</span>
                    <span class="text-sky">₱<span id="breakdownGrandTotal">0.00</span></span>
                </div>
                <div class="mt-2 small text-muted">
                    <i class="fa-solid fa-circle-info me-1"></i>
                    Rate: ₱${LALAMOVE_BASE_FARE} base (first ${LALAMOVE_BASE_KM} km) + ₱${LALAMOVE_PER_KM}/km after
                </div>
            </div>

            <hr class="my-3">

            <div class="mb-3">
                <label for="orderNotes" class="form-label fw-medium">Order Notes (Optional)</label>
                <textarea class="form-control" id="orderNotes" rows="2"
                    placeholder="Special instructions or notes..."></textarea>
            </div>
            <div class="mb-3">
                <label for="paymentMethod" class="form-label fw-medium">Payment Method</label>
                <select class="form-select" id="paymentMethod" required>
                    <option value="" disabled selected>Select payment method...</option>
                    <option value="Cash On Delivery">Cash On Delivery (COD)</option>
                    <option value="GCASH">GCash</option>
                    <option value="Card">Card</option>
                </select>
                <small class="text-muted d-block mt-2">Choose how you'd like to pay for this order</small>
            </div>
            <div id="gcashPaySection" class="mb-3" style="display:none;">
                <button type="button" class="btn btn-info w-100" id="gcashPayBtn">
                    <i class="fa-solid fa-mobile-screen me-2"></i>Pay with GCash
                </button>
                <div id="gcashProofStatus" class="mt-2 small" style="display:none;"></div>
            </div>
        </form>
    `;

    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-sky" id="confirmOrderBtn">Place Order</button>
    `;

    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    // Reset modal dialog class when this modal closes
    modal.addEventListener('hidden.bs.modal', () => {
        modalDialog.className = 'modal-dialog modal-dialog-centered';
    }, { once: true });

    let currentDeliveryFee = null;
    let currentDeliveryKm = null;
    let geocodeTimer = null;
    let deliveryMap = null;
    let deliveryMarker = null;
    let mapInitialized = false;
    let gcashScreenshotFile = null;

    // ── GCash QR overlay ─────────────────────────────────────
    if (!document.getElementById('gcashQROverlay')) {
        const overlayEl = document.createElement('div');
        overlayEl.id = 'gcashQROverlay';
        overlayEl.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:1200;align-items:center;justify-content:center;';
        overlayEl.innerHTML = `
            <div style="background:#fff;border-radius:14px;padding:28px 24px;max-width:420px;width:90%;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,0.35);">
                <div class="d-flex align-items-center mb-3">
                    <div class="rounded-circle d-flex align-items-center justify-content-center me-2" style="width:38px;height:38px;background:#0070e0;flex-shrink:0;">
                        <i class="fa-solid fa-mobile-screen text-white"></i>
                    </div>
                    <h5 class="mb-0 fw-bold">Pay with GCash</h5>
                    <button type="button" id="gcashOverlayClose" class="btn-close ms-auto"></button>
                </div>
                <p class="text-muted small mb-3">Scan the QR code below using your GCash app, then upload your transaction screenshot to confirm payment.</p>
                <div class="text-center mb-3">
                    <img src="Images/PaymentQR/gentrisbestqrforgcash.jpg" alt="GCash QR Code" class="img-fluid rounded"
                        style="max-width:220px;border:2px solid #e0e0e0;padding:8px;"
                        onerror="this.outerHTML='<div class=\'border rounded p-4 text-center text-muted\' style=\'max-width:220px;margin:auto;\'><i class=\'fa-solid fa-qrcode fa-4x mb-2\'></i><br><small>Place your GCash QR code image at<br><strong>Images/gcash_qr.png</strong></small></div>'">
                </div>
                <hr>
                <p class="fw-medium mb-2 small"><i class="fa-solid fa-upload me-2 text-info"></i>Upload your payment screenshot:</p>
                <input type="file" id="gcashScreenshotInput" accept="image/*" class="form-control mb-2">
                <div id="gcashScreenshotPreview" style="display:none;" class="mb-3 text-center">
                    <img id="gcashPreviewImg" src="" alt="Preview" class="img-fluid rounded" style="max-height:180px;border:1px solid #dee2e6;">
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button type="button" id="gcashOverlayCancel" class="btn btn-secondary flex-fill">Cancel</button>
                    <button type="button" id="gcashOverlayConfirm" class="btn btn-info flex-fill" disabled>
                        <i class="fa-solid fa-check me-1"></i>Confirm Payment
                    </button>
                </div>
            </div>`;
        document.body.appendChild(overlayEl);
    }

    const gcashOverlay = document.getElementById('gcashQROverlay');

    function openGcashOverlay() {
        gcashOverlay.style.display = 'flex';
        document.getElementById('gcashScreenshotInput').value = '';
        document.getElementById('gcashScreenshotPreview').style.display = 'none';
        document.getElementById('gcashOverlayConfirm').disabled = true;
    }

    function closeGcashOverlay() {
        gcashOverlay.style.display = 'none';
    }

    document.getElementById('gcashOverlayClose').onclick = closeGcashOverlay;
    document.getElementById('gcashOverlayCancel').onclick = closeGcashOverlay;

    document.getElementById('gcashScreenshotInput').onchange = function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('gcashPreviewImg').src = e.target.result;
            document.getElementById('gcashScreenshotPreview').style.display = 'block';
            document.getElementById('gcashOverlayConfirm').disabled = false;
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('gcashOverlayConfirm').onclick = function () {
        const file = document.getElementById('gcashScreenshotInput').files[0];
        if (!file) return;
        gcashScreenshotFile = file;
        closeGcashOverlay();
        const statusEl = document.getElementById('gcashProofStatus');
        statusEl.innerHTML = `<div class="alert alert-success py-2 mb-0 d-flex align-items-center">
            <i class="fa-solid fa-circle-check text-success me-2"></i>
            <span class="flex-fill text-truncate">Screenshot attached: <strong>${file.name}</strong></span>
            <button type="button" id="gcashProofRemoveBtn" class="btn btn-sm btn-outline-danger ms-2 py-0">Remove</button>
        </div>`;
        statusEl.style.display = 'block';
        document.getElementById('gcashProofRemoveBtn').onclick = function () {
            gcashScreenshotFile = null;
            statusEl.style.display = 'none';
        };
    };

    document.getElementById('paymentMethod').addEventListener('change', function () {
        const gcashSection = document.getElementById('gcashPaySection');
        if (this.value === 'GCASH') {
            gcashSection.style.display = 'block';
        } else {
            gcashSection.style.display = 'none';
            gcashScreenshotFile = null;
            document.getElementById('gcashProofStatus').style.display = 'none';
        }
    });

    document.getElementById('gcashPayBtn').addEventListener('click', openGcashOverlay);

    // ── helpers ──────────────────────────────────────────────

    function getApplicablePrice(qty) {
        return (qty >= 10 && wholesale) ? wholesale : regularPrice;
    }

    function renderPriceInfo(qty) {
        let html = `<p class="text-muted mb-0">Regular Price: <strong>₱${regularPrice.toFixed(2)}</strong>/unit</p>`;
        if (qty >= 10 && wholesale) {
            const savings = (regularPrice - wholesale) * qty;
            html = `
                <div class="mb-2">
                    <p class="text-muted mb-1"><del>Regular Price: ₱${regularPrice.toFixed(2)}/unit</del></p>
                    <p class="text-success mb-1"><strong>Wholesale Price: ₱${wholesale.toFixed(2)}/unit</strong></p>
                    <span class="badge bg-success">
                        <i class="fa-solid fa-percentage me-1"></i>Save ₱${savings.toFixed(2)} on this order!
                    </span>
                </div>`;
        } else if (wholesale && qty < 10) {
            const needed = 10 - qty;
            html = `
                <p class="text-muted mb-0">Regular Price: <strong>₱${regularPrice.toFixed(2)}</strong>/unit</p>
                <p class="text-info small mt-2 mb-0">
                    <i class="fa-solid fa-lightbulb me-1"></i>Buy ${needed} more unit${needed !== 1 ? 's' : ''} to unlock wholesale pricing (₱${wholesale.toFixed(2)}/unit)
                </p>`;
        }
        document.getElementById('priceInfo').innerHTML = html;
    }

    function renderBreakdown() {
        const qty = parseInt(document.getElementById('orderQuantity').value) || 0;
        renderPriceInfo(qty);
        const bd = document.getElementById('deliveryFeeBreakdown');
        if (currentDeliveryFee === null || qty === 0) { bd.style.display = 'none'; return; }
        const subtotal = qty * getApplicablePrice(qty);
        const grand = subtotal + currentDeliveryFee;
        bd.style.display = 'block';
        document.getElementById('breakdownDistance').textContent  = `~${currentDeliveryKm.toFixed(1)} km`;
        document.getElementById('breakdownSubtotal').textContent  = subtotal.toFixed(2);
        document.getElementById('breakdownDelivery').textContent  = currentDeliveryFee.toFixed(2);
        document.getElementById('breakdownGrandTotal').textContent = grand.toFixed(2);
    }

    function setGeoStatus(state) {
        const icon = document.querySelector('#geocodeStatus i');
        const hint = document.getElementById('geocodeHint');
        const map = { loading: ['fa-solid fa-spinner fa-spin text-secondary', '<span class="text-secondary">Locating address…</span>'],
                      ok:      ['fa-solid fa-circle-check text-success',   '<span class="text-success">Location found — fee calculated below.</span>'],
                      error:   ['fa-solid fa-circle-xmark text-danger',    '<span class="text-danger">Address not found. Try a more specific address or use the map.</span>'],
                      idle:    ['fa-solid fa-location-dot text-muted',     'Type your address, or use the buttons below to set your location.'] };
        const [cls, msg] = map[state] || map.idle;
        icon.className = cls;
        hint.innerHTML = msg;
    }

    function applyCoords(lat, lng) {
        const straightKm = haversineKm(STORE_LAT, STORE_LNG, lat, lng);
        currentDeliveryKm = straightKm * ROAD_FACTOR;
        currentDeliveryFee = calcLalamoveFee(currentDeliveryKm);
        renderBreakdown();
    }

    // ── map picker ───────────────────────────────────────────

    function initLeafletMap() {
        if (mapInitialized) {
            deliveryMap.invalidateSize();
            return;
        }
        mapInitialized = true;

        deliveryMap = L.map('deliveryMap', { zoomControl: true }).setView([STORE_LAT, STORE_LNG], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(deliveryMap);

        // Store marker (fixed, blue)
        const storeIcon = L.divIcon({
            html: `<div style="background:#0ea5e9;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4);"></div>`,
            className: '', iconAnchor: [7, 7]
        });
        L.marker([STORE_LAT, STORE_LNG], { icon: storeIcon, interactive: false })
            .addTo(deliveryMap)
            .bindTooltip("GenTri's Best Store", { permanent: false });

        // Delivery marker (draggable, red) — starts hidden until user picks
        const deliveryIcon = L.divIcon({
            html: `<div style="background:#e74c3c;width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4);"></div>`,
            className: '', iconAnchor: [8, 16]
        });
        deliveryMarker = L.marker([STORE_LAT, STORE_LNG], {
            icon: deliveryIcon, draggable: true, opacity: 0
        }).addTo(deliveryMap).bindTooltip('Your delivery location');

        deliveryMarker.on('dragend', async () => {
            const { lat, lng } = deliveryMarker.getLatLng();
            await onPinSet(lat, lng);
        });

        deliveryMap.on('click', async (e) => {
            deliveryMarker.setLatLng(e.latlng);
            deliveryMarker.setOpacity(1);
            await onPinSet(e.latlng.lat, e.latlng.lng);
        });
    }

    async function onPinSet(lat, lng) {
        applyCoords(lat, lng);
        setGeoStatus('loading');
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                { headers: { 'Accept': 'application/json' } }
            );
            const data = await res.json();
            if (data && data.display_name) {
                document.getElementById('deliveryAddress').value = data.display_name;
                setGeoStatus('ok');
                return;
            }
        } catch (_) {}
        // Fee is still calculated even if reverse-geocode fails
        document.getElementById('deliveryAddress').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setGeoStatus('ok');
    }

    function placeMarkerAt(lat, lng) {
        if (!mapInitialized) return;
        deliveryMarker.setLatLng([lat, lng]);
        deliveryMarker.setOpacity(1);
        deliveryMap.setView([lat, lng], 16);
    }

    // ── button wiring ────────────────────────────────────────

    document.getElementById('toggleMapBtn').addEventListener('click', () => {
        const section = document.getElementById('mapPickerSection');
        const btn = document.getElementById('toggleMapBtn');
        if (section.style.display === 'none') {
            section.style.display = 'block';
            btn.innerHTML = '<i class="fa-solid fa-map-location-dot me-1"></i>Hide Map';
            btn.classList.replace('btn-outline-primary', 'btn-primary');
            // Leaflet must init after the div is visible
            setTimeout(initLeafletMap, 50);
        } else {
            section.style.display = 'none';
            btn.innerHTML = '<i class="fa-solid fa-map-location-dot me-1"></i>Pin on Map';
            btn.classList.replace('btn-primary', 'btn-outline-primary');
        }
    });

    document.getElementById('useGpsBtn').addEventListener('click', () => {
        if (!navigator.geolocation) {
            setGeoStatus('error');
            document.getElementById('geocodeHint').innerHTML =
                '<span class="text-danger">GPS not supported by your browser.</span>';
            return;
        }
        const btn = document.getElementById('useGpsBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Getting location…';

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;

                // Show map automatically when GPS fires
                const section = document.getElementById('mapPickerSection');
                if (section.style.display === 'none') {
                    document.getElementById('toggleMapBtn').click();
                }

                // Wait for map init then place marker
                setTimeout(async () => {
                    placeMarkerAt(latitude, longitude);
                    await onPinSet(latitude, longitude);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-crosshairs me-1"></i>Use My Location';
                }, 150);
            },
            () => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-crosshairs me-1"></i>Use My Location';
                setGeoStatus('error');
                document.getElementById('geocodeHint').innerHTML =
                    '<span class="text-danger">Could not get your location. Please allow location access or type your address.</span>';
            }
        );
    });

    // ── address text-input geocoding (debounced) ─────────────

    document.getElementById('deliveryAddress').addEventListener('input', () => {
        clearTimeout(geocodeTimer);
        const addr = document.getElementById('deliveryAddress').value.trim();
        if (addr.length < 8) {
            currentDeliveryFee = null;
            currentDeliveryKm = null;
            setGeoStatus('idle');
            renderBreakdown();
            return;
        }
        setGeoStatus('loading');
        geocodeTimer = setTimeout(async () => {
            const result = await geocodeAddress(addr);
            if (!result) {
                currentDeliveryFee = null;
                currentDeliveryKm = null;
                setGeoStatus('error');
                renderBreakdown();
                return;
            }
            applyCoords(result.lat, result.lng);
            setGeoStatus('ok');
            renderBreakdown();
            // Sync map pin if map is open
            if (mapInitialized) placeMarkerAt(result.lat, result.lng);
        }, 900);
    });

    document.getElementById('orderQuantity').addEventListener('input', renderBreakdown);
    renderPriceInfo(1);

    // ── confirm order ────────────────────────────────────────

    document.getElementById('confirmOrderBtn').onclick = function () {
        const quantity = parseInt(document.getElementById('orderQuantity').value);
        const notes = document.getElementById('orderNotes').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const deliveryAddress = document.getElementById('deliveryAddress').value.trim();

        if (!quantity || quantity <= 0) {
            return showModal('Error', 'Please enter a valid quantity', 'bg-warning',
                [{text: 'Ok', class: 'btn btn-warning', dataDismiss: true}]);
        }
        if (!deliveryAddress) {
            return showModal('Error', 'Please enter your delivery address or pin your location on the map', 'bg-warning',
                [{text: 'Ok', class: 'btn btn-warning', dataDismiss: true}]);
        }
        if (currentDeliveryFee === null) {
            return showModal('Error', 'Delivery fee is still being calculated. Please wait or check your address.', 'bg-warning',
                [{text: 'Ok', class: 'btn btn-warning', dataDismiss: true}]);
        }
        if (!paymentMethod) {
            return showModal('Error', 'Please select a payment method', 'bg-warning',
                [{text: 'Ok', class: 'btn btn-warning', dataDismiss: true}]);
        }
        if (paymentMethod === 'GCASH' && !gcashScreenshotFile) {
            return showModal('GCash Screenshot Required', 'Please click <strong>Pay with GCash</strong>, scan the QR code, then upload your transaction screenshot before placing the order.', 'bg-info text-white',
                [{text: 'Ok', class: 'btn btn-info', dataDismiss: true}]);
        }

        bootstrapModal.hide();
        performPlaceOrder(productId, quantity, notes, paymentMethod, deliveryAddress, currentDeliveryFee, gcashScreenshotFile);
    };
}

function performPlaceOrder(productId, quantity, notes, paymentMethod, deliveryAddress, deliveryFee, gcashScreenshot) {
    const formData = new FormData();
    formData.append('action', 'place_order');
    formData.append('productId', productId);
    formData.append('quantity', quantity);
    formData.append('notes', notes);
    formData.append('paymentMethod', paymentMethod);
    formData.append('deliveryAddress', deliveryAddress || '');
    formData.append('deliveryFee', deliveryFee || 0);
    if (gcashScreenshot) {
        formData.append('gcashScreenshot', gcashScreenshot);
    }

    fetch('customer_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let priceTypeNotice = '';
            if (data.priceType === 'WHOLESALE') {
                priceTypeNotice = `<div class="alert alert-success mt-2 mb-0 py-2">
                    <i class="fa-solid fa-tags me-2"></i><strong>Wholesale pricing applied!</strong>
                </div>`;
            }

            let paymentMethodIcon = '';
            if (paymentMethod === 'Cash On Delivery') {
                paymentMethodIcon = '<i class="fa-solid fa-money-bill me-1"></i>';
            } else if (paymentMethod === 'GCASH') {
                paymentMethodIcon = '<i class="fa-solid fa-mobile me-1"></i>';
            } else if (paymentMethod === 'Card') {
                paymentMethodIcon = '<i class="fa-solid fa-credit-card me-1"></i>';
            }

            const deliveryFeeDisplay = parseFloat(data.deliveryFee) > 0
                ? `<div class="border rounded p-2 mb-2 bg-light small">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">Product Subtotal</span>
                        <span>₱${data.subtotal}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted"><i class="fa-solid fa-motorcycle me-1"></i>Delivery Fee</span>
                        <span>₱${data.deliveryFee}</span>
                    </div>
                    <div class="d-flex justify-content-between fw-bold border-top pt-1 mt-1">
                        <span>Grand Total</span>
                        <span>₱${data.totalPrice}</span>
                    </div>
                   </div>`
                : `<p class="mb-2"><strong>Total Amount:</strong> ₱${data.totalPrice}</p>`;

            showModal(
                'Order Placed Successfully',
                `<p class="mb-2"><i class="fa-solid fa-check-circle text-success me-2"></i>Your order has been placed!</p>
                <p class="mb-2"><strong>Order Number:</strong> ${data.orderNumber}</p>
                <p class="mb-2"><strong>Unit Price:</strong> ₱${data.unitPrice}</p>
                ${deliveryFeeDisplay}
                ${data.deliveryAddress ? `<p class="mb-2"><strong><i class="fa-solid fa-location-dot me-1"></i>Deliver to:</strong> ${data.deliveryAddress}</p>` : ''}
                <p class="mb-2"><strong>Payment Method:</strong> ${paymentMethodIcon}${paymentMethod}</p>
                ${priceTypeNotice}`,
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

// ============================================
// USER CART FUNCTIONS
// ============================================

function showAddToCartModal(productId) {
    const product = allBrowseProducts.find(p => parseInt(p.ProductID) === parseInt(productId));
    if (!product) return;

    const regularPrice = parseFloat(product.Price);
    const wholesale = product.WholesalePrice && parseFloat(product.WholesalePrice) > 0
        ? parseFloat(product.WholesalePrice) : null;
    const maxQty = parseInt(product.Quantity);

    // Pre-fill with existing cart quantity if already added
    const existingItem = userCart.find(i => parseInt(i.productId) === parseInt(productId));
    const startQty = existingItem ? existingItem.quantity : 1;

    const modal = document.getElementById('adminModal');
    const modalDialog = document.getElementById('adminModalDialog');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');

    modalDialog.className = 'modal-dialog modal-dialog-centered';
    modalHeader.className = 'modal-header bg-sky text-white';
    modalTitle.textContent = 'Add to Cart';

    modalBody.innerHTML = `
        <div class="mb-3">
            <h6 class="fw-bold mb-1">${product.ProductName}</h6>
            <p class="text-muted small mb-0">${product.Description || ''}</p>
        </div>

        <div id="atcPriceInfo" class="mb-3"></div>

        <div class="mb-3">
            <label class="form-label fw-medium">Quantity <span class="text-muted small">(${maxQty} in stock)</span></label>
            <div class="input-group">
                <button class="btn btn-outline-secondary" type="button" id="atcQtyMinus">
                    <i class="fa-solid fa-minus"></i>
                </button>
                <input type="number" class="form-control text-center" id="atcQty"
                    min="1" max="${maxQty}" value="${startQty}">
                <button class="btn btn-outline-secondary" type="button" id="atcQtyPlus">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        </div>

        <div id="atcTotalDisplay" class="alert alert-info py-2 mb-0"></div>
    `;

    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-sky fw-medium" id="atcConfirmBtn">
            <i class="fa-solid fa-cart-plus me-1"></i>Add to Cart
        </button>`;

    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    modal.addEventListener('hidden.bs.modal', () => {
        modalDialog.className = 'modal-dialog modal-dialog-centered';
    }, { once: true });

    function getPrice(qty) {
        return (qty >= 10 && wholesale) ? wholesale : regularPrice;
    }

    function renderAtcInfo() {
        const qty = parseInt(document.getElementById('atcQty').value) || 1;
        const unitPrice = getPrice(qty);
        const subtotal = unitPrice * qty;

        let priceHTML = '';
        if (wholesale) {
            if (qty >= 10) {
                const savings = (regularPrice - wholesale) * qty;
                priceHTML = `
                    <div class="border rounded p-2 bg-success bg-opacity-10 mb-2">
                        <div class="text-muted small"><del>Regular: ₱${regularPrice.toFixed(2)}/unit</del></div>
                        <div class="text-success fw-bold">Wholesale: ₱${wholesale.toFixed(2)}/unit</div>
                        <span class="badge bg-success mt-1">
                            <i class="fa-solid fa-tag me-1"></i>You save ₱${savings.toFixed(2)}!
                        </span>
                    </div>`;
            } else {
                const needed = 10 - qty;
                priceHTML = `
                    <div class="border rounded p-2 mb-2">
                        <div class="fw-bold">₱${regularPrice.toFixed(2)}/unit</div>
                        <div class="text-info small mt-1">
                            <i class="fa-solid fa-lightbulb me-1"></i>
                            Add <strong>${needed}</strong> more unit${needed !== 1 ? 's' : ''} to unlock
                            wholesale price (₱${wholesale.toFixed(2)}/unit)
                        </div>
                        <div class="progress mt-2" style="height:6px;">
                            <div class="progress-bar bg-info" style="width:${Math.min(qty / 10 * 100, 100)}%"></div>
                        </div>
                        <div class="text-muted" style="font-size:0.72rem;">${qty}/10 units</div>
                    </div>`;
            }
        } else {
            priceHTML = `<div class="fw-bold mb-2">₱${regularPrice.toFixed(2)}/unit</div>`;
        }

        document.getElementById('atcPriceInfo').innerHTML = priceHTML;
        document.getElementById('atcTotalDisplay').innerHTML =
            `<div class="d-flex justify-content-between">
                <span>Subtotal (${qty} unit${qty !== 1 ? 's' : ''})</span>
                <strong>₱${subtotal.toFixed(2)}</strong>
            </div>`;
    }

    renderAtcInfo();

    document.getElementById('atcQty').addEventListener('input', renderAtcInfo);

    document.getElementById('atcQtyMinus').addEventListener('click', () => {
        const input = document.getElementById('atcQty');
        const val = Math.max(1, (parseInt(input.value) || 1) - 1);
        input.value = val;
        renderAtcInfo();
    });

    document.getElementById('atcQtyPlus').addEventListener('click', () => {
        const input = document.getElementById('atcQty');
        const val = Math.min(maxQty, (parseInt(input.value) || 1) + 1);
        input.value = val;
        renderAtcInfo();
    });

    document.getElementById('atcConfirmBtn').onclick = function () {
        const qty = parseInt(document.getElementById('atcQty').value) || 0;
        if (qty <= 0) return;
        if (qty > maxQty) {
            document.getElementById('atcQty').value = maxQty;
            return;
        }
        bootstrapModal.hide();
        addToUserCart(parseInt(productId), product.ProductName, regularPrice, wholesale, qty);
    };
}

function addToUserCart(productId, productName, regularPrice, wholesalePrice, quantity) {
    quantity = parseInt(quantity) || 1;
    const unitPrice = (quantity >= 10 && wholesalePrice) ? wholesalePrice : regularPrice;
    const priceType = (quantity >= 10 && wholesalePrice) ? 'WHOLESALE' : 'REGULAR';

    const existing = userCart.findIndex(item => parseInt(item.productId) === parseInt(productId));
    if (existing >= 0) {
        userCart[existing].quantity = quantity;
        userCart[existing].unitPrice = unitPrice;
        userCart[existing].priceType = priceType;
        userCart[existing].itemTotal = unitPrice * quantity;
    } else {
        userCart.push({
            productId: productId,
            productName: productName,
            quantity: quantity,
            regularPrice: regularPrice,
            wholesalePrice: wholesalePrice || null,
            unitPrice: unitPrice,
            priceType: priceType,
            itemTotal: unitPrice * quantity
        });
    }
    updateCartBadge();
    showCartToast(productName);
}

function showCartToast(productName) {
    const existing = document.getElementById('cartToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'cartToast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;min-width:260px;';
    toast.innerHTML = `
        <div class="alert alert-success d-flex align-items-center shadow mb-0 py-2">
            <i class="fa-solid fa-cart-plus me-2"></i>
            <span><strong>${productName}</strong> added to cart!</span>
        </div>`;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2500);
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const total = userCart.reduce((sum, item) => sum + item.quantity, 0);
    if (total > 0) {
        badge.textContent = total > 99 ? '99+' : total;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function loadUserCart() {
    displayUserCart();
}

function displayUserCart() {
    const container = document.getElementById('cartSectionContainer');
    if (!container) return;

    if (userCart.length === 0) {
        container.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-sky text-white">
                    <h5 class="mb-0"><i class="fa-solid fa-cart-shopping me-2"></i>My Cart</h5>
                </div>
                <div class="card-body text-center py-5 text-muted">
                    <i class="fa-solid fa-cart-shopping fa-3x mb-3 opacity-25"></i>
                    <p class="mb-3">Your cart is empty</p>
                    <a href="#" onclick="showSection('products'); loadBrowseProducts()" class="btn btn-sky">
                        <i class="fa-solid fa-store me-2"></i>Browse Products
                    </a>
                </div>
            </div>`;
        return;
    }

    let cartSubtotal = 0;
    let totalUnits = 0;
    userCart.forEach(item => { cartSubtotal += item.itemTotal; totalUnits += item.quantity; });

    let rowsHTML = '';
    userCart.forEach((item, index) => {
        const priceLabel = item.priceType === 'WHOLESALE'
            ? '<span class="badge bg-success ms-1 align-middle">Wholesale</span>'
            : '';
        const wholesaleHint = item.wholesalePrice && item.priceType !== 'WHOLESALE'
            ? `<div class="text-info" style="font-size:0.75rem;"><i class="fa-solid fa-lightbulb me-1"></i>Buy ${10 - item.quantity} more for wholesale pricing</div>`
            : '';
        rowsHTML += `
            <tr>
                <td>
                    <div class="fw-bold">${item.productName}${priceLabel}</div>
                    <div class="text-muted small">₱${item.unitPrice.toFixed(2)}/unit</div>
                    ${wholesaleHint}
                </td>
                <td class="text-center" style="width:150px;">
                    <div class="input-group input-group-sm justify-content-center">
                        <button class="btn btn-outline-secondary" type="button"
                            onclick="updateUserCartItemQuantity(${index}, ${item.quantity - 1})">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <input type="number" class="form-control text-center border-secondary" value="${item.quantity}" min="1"
                            style="max-width:50px;"
                            onchange="updateUserCartItemQuantity(${index}, parseInt(this.value)||1)">
                        <button class="btn btn-outline-secondary" type="button"
                            onclick="updateUserCartItemQuantity(${index}, ${item.quantity + 1})">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td class="text-end fw-bold">₱${item.itemTotal.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="removeUserCartItem(${index})" title="Remove">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    });

    container.innerHTML = `
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-sky text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="fa-solid fa-cart-shopping me-2"></i>My Cart</h5>
                <span class="badge bg-light text-sky">${userCart.length} product(s)</span>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Product</th>
                                <th class="text-center">Quantity</th>
                                <th class="text-end">Subtotal</th>
                                <th class="text-center">Remove</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHTML}</tbody>
                    </table>
                </div>
                <div class="border-top pt-3 mt-2">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <p class="text-muted mb-0">${totalUnits} unit(s) across ${userCart.length} product(s)</p>
                        <h5 class="mb-0 text-sky fw-bold">Items Total: ₱${cartSubtotal.toFixed(2)}</h5>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-danger" onclick="clearUserCart()">
                            <i class="fa-solid fa-trash me-1"></i>Clear Cart
                        </button>
                        <button class="btn btn-sky flex-fill fw-medium" onclick="checkoutUserCart()">
                            <i class="fa-solid fa-bag-shopping me-2"></i>Proceed to Checkout
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
}

function updateUserCartItemQuantity(index, qty) {
    qty = parseInt(qty) || 1;
    if (qty <= 0) { removeUserCartItem(index); return; }
    const item = userCart[index];
    item.quantity = qty;
    if (qty >= 10 && item.wholesalePrice) {
        item.unitPrice = item.wholesalePrice;
        item.priceType = 'WHOLESALE';
    } else {
        item.unitPrice = item.regularPrice;
        item.priceType = 'REGULAR';
    }
    item.itemTotal = item.unitPrice * qty;
    updateCartBadge();
    displayUserCart();
}

function removeUserCartItem(index) {
    userCart.splice(index, 1);
    updateCartBadge();
    displayUserCart();
}

function clearUserCart() {
    showModal(
        'Clear Cart',
        '<p class="mb-0">Are you sure you want to remove all items from your cart?</p>',
        'bg-warning',
        [
            { text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true },
            { text: 'Clear Cart', class: 'btn btn-danger', onclick: () => {
                const m = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                if (m) m.hide();
                userCart = [];
                updateCartBadge();
                displayUserCart();
            }}
        ]
    );
}

function checkoutUserCart() {
    if (userCart.length === 0) {
        showModal('Empty Cart', '<p class="mb-0">Your cart is empty.</p>', 'bg-warning',
            [{ text: 'Ok', class: 'btn btn-warning', dataDismiss: true }]);
        return;
    }

    const modal = document.getElementById('adminModal');
    const modalDialog = document.getElementById('adminModalDialog');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');

    modalDialog.className = 'modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable';
    modalHeader.className = 'modal-header bg-sky text-white';
    modalTitle.textContent = 'Checkout';

    let cartSubtotal = 0;
    userCart.forEach(item => cartSubtotal += item.itemTotal);

    let itemsSummaryHTML = '';
    userCart.forEach(item => {
        const label = item.priceType === 'WHOLESALE' ? ' <span class="badge bg-success">Wholesale</span>' : '';
        itemsSummaryHTML += `
            <div class="d-flex justify-content-between small mb-1">
                <span>${item.productName} x${item.quantity}${label}</span>
                <span>₱${item.itemTotal.toFixed(2)}</span>
            </div>`;
    });

    modalBody.innerHTML = `
        <div class="mb-3">
            <h6 class="fw-bold mb-2"><i class="fa-solid fa-receipt me-2 text-sky"></i>Order Summary</h6>
            <div class="border rounded p-3 bg-light">
                ${itemsSummaryHTML}
                <hr class="my-2">
                <div class="d-flex justify-content-between fw-bold">
                    <span>Items Subtotal</span>
                    <span>₱${cartSubtotal.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <hr class="my-3">
        <h6 class="fw-semibold mb-2"><i class="fa-solid fa-truck me-2 text-sky"></i>Delivery Details</h6>

        <div class="mb-2">
            <label class="form-label fw-medium">Delivery Address <span class="text-danger">*</span></label>
            <div class="input-group">
                <input type="text" class="form-control" id="cartDeliveryAddress"
                    placeholder="Type address or use map / GPS below" autocomplete="off">
                <span class="input-group-text bg-white" id="cartGeocodeStatus">
                    <i class="fa-solid fa-location-dot text-muted"></i>
                </span>
            </div>
            <small id="cartGeocodeHint" class="text-muted">Type your address, or use the buttons below to set your location.</small>
        </div>

        <div class="d-flex gap-2 mb-3">
            <button type="button" class="btn btn-outline-primary btn-sm" id="cartToggleMapBtn">
                <i class="fa-solid fa-map-location-dot me-1"></i>Pin on Map
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" id="cartUseGpsBtn">
                <i class="fa-solid fa-crosshairs me-1"></i>Use My Location
            </button>
        </div>

        <div id="cartMapPickerSection" style="display:none;" class="mb-3">
            <div id="cartDeliveryMap" style="height:280px; border-radius:8px; border:1px solid #dee2e6; z-index:0;"></div>
            <small class="text-muted mt-1 d-block">
                <i class="fa-solid fa-hand-pointer me-1"></i>Click the map or drag the
                <span style="color:#e74c3c;">&#x25CF;</span> pin to set your delivery location.
                <span style="color:#0ea5e9;">&#x25CF;</span> = store.
            </small>
        </div>

        <div id="cartDeliveryFeeBreakdown" class="alert alert-secondary py-2 mb-3" style="display:none;">
            <div class="d-flex justify-content-between small mb-1 text-muted">
                <span><i class="fa-solid fa-route me-1"></i>Estimated road distance</span>
                <span id="cartBreakdownDistance">—</span>
            </div>
            <div class="d-flex justify-content-between small mb-1">
                <span>Items Subtotal</span>
                <span>₱<span id="cartBreakdownSubtotal">${cartSubtotal.toFixed(2)}</span></span>
            </div>
            <div class="d-flex justify-content-between small mb-1">
                <span><i class="fa-solid fa-motorcycle me-1 text-sky"></i>Delivery Fee (Lalamove)</span>
                <span>₱<span id="cartBreakdownDelivery">0.00</span></span>
            </div>
            <hr class="my-1">
            <div class="d-flex justify-content-between fw-bold">
                <span>Grand Total</span>
                <span class="text-sky">₱<span id="cartBreakdownGrandTotal">${cartSubtotal.toFixed(2)}</span></span>
            </div>
            <div class="mt-2 small text-muted">
                <i class="fa-solid fa-circle-info me-1"></i>
                Rate: ₱${LALAMOVE_BASE_FARE} base (first ${LALAMOVE_BASE_KM} km) + ₱${LALAMOVE_PER_KM}/km after
            </div>
        </div>

        <hr class="my-3">

        <div class="mb-3">
            <label class="form-label fw-medium">Payment Method <span class="text-danger">*</span></label>
            <select class="form-select" id="cartPaymentMethod">
                <option value="" disabled selected>Select payment method...</option>
                <option value="Cash On Delivery">Cash On Delivery (COD)</option>
                <option value="GCASH">GCash</option>
                <option value="Card">Card</option>
            </select>
        </div>

        <div id="cartGcashPaySection" class="mb-3" style="display:none;">
            <button type="button" class="btn btn-info w-100" id="cartGcashPayBtn">
                <i class="fa-solid fa-mobile-screen me-2"></i>Pay with GCash
            </button>
            <div id="cartGcashProofStatus" class="mt-2 small" style="display:none;"></div>
        </div>

        <div class="mb-3">
            <label class="form-label fw-medium">Order Notes (Optional)</label>
            <textarea class="form-control" id="cartOrderNotes" rows="2"
                placeholder="Special instructions for your order..."></textarea>
        </div>
    `;

    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-sky fw-medium" id="confirmCartCheckoutBtn">
            <i class="fa-solid fa-bag-shopping me-1"></i>Place Order
        </button>`;

    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    modal.addEventListener('hidden.bs.modal', () => {
        modalDialog.className = 'modal-dialog modal-dialog-centered';
    }, { once: true });

    let currentDeliveryFee = null;
    let currentDeliveryKm = null;
    let geocodeTimer = null;
    let deliveryMap = null;
    let deliveryMarker = null;
    let mapInitialized = false;
    let gcashScreenshotFile = null;

    // GCash overlay (reuse existing or create)
    if (!document.getElementById('gcashQROverlay')) {
        const overlayEl = document.createElement('div');
        overlayEl.id = 'gcashQROverlay';
        overlayEl.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:1200;align-items:center;justify-content:center;';
        overlayEl.innerHTML = `
            <div style="background:#fff;border-radius:14px;padding:28px 24px;max-width:420px;width:90%;max-height:90vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,0.35);">
                <div class="d-flex align-items-center mb-3">
                    <div class="rounded-circle d-flex align-items-center justify-content-center me-2" style="width:38px;height:38px;background:#0070e0;flex-shrink:0;">
                        <i class="fa-solid fa-mobile-screen text-white"></i>
                    </div>
                    <h5 class="mb-0 fw-bold">Pay with GCash</h5>
                    <button type="button" id="gcashOverlayClose" class="btn-close ms-auto"></button>
                </div>
                <p class="text-muted small mb-3">Scan the QR code below using your GCash app, then upload your transaction screenshot to confirm payment.</p>
                <div class="text-center mb-3">
                    <img src="Images/PaymentQR/gentrisbestqrforgcash.jpg" alt="GCash QR Code" class="img-fluid rounded"
                        style="max-width:220px;border:2px solid #e0e0e0;padding:8px;"
                        onerror="this.outerHTML='<div class=\'border rounded p-4 text-center text-muted\' style=\'max-width:220px;margin:auto;\'><i class=\'fa-solid fa-qrcode fa-4x mb-2\'></i><br><small>QR not found</small></div>'">
                </div>
                <hr>
                <p class="fw-medium mb-2 small"><i class="fa-solid fa-upload me-2 text-info"></i>Upload your payment screenshot:</p>
                <input type="file" id="gcashScreenshotInput" accept="image/*" class="form-control mb-2">
                <div id="gcashScreenshotPreview" style="display:none;" class="mb-3 text-center">
                    <img id="gcashPreviewImg" src="" alt="Preview" class="img-fluid rounded" style="max-height:180px;border:1px solid #dee2e6;">
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button type="button" id="gcashOverlayCancel" class="btn btn-secondary flex-fill">Cancel</button>
                    <button type="button" id="gcashOverlayConfirm" class="btn btn-info flex-fill" disabled>
                        <i class="fa-solid fa-check me-1"></i>Confirm Payment
                    </button>
                </div>
            </div>`;
        document.body.appendChild(overlayEl);
    }

    const gcashOverlay = document.getElementById('gcashQROverlay');

    function openGcashOverlayCart() {
        gcashOverlay.style.display = 'flex';
        document.getElementById('gcashScreenshotInput').value = '';
        document.getElementById('gcashScreenshotPreview').style.display = 'none';
        document.getElementById('gcashOverlayConfirm').disabled = true;
    }

    document.getElementById('gcashOverlayClose').onclick = () => { gcashOverlay.style.display = 'none'; };
    document.getElementById('gcashOverlayCancel').onclick = () => { gcashOverlay.style.display = 'none'; };

    document.getElementById('gcashScreenshotInput').onchange = function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('gcashPreviewImg').src = e.target.result;
            document.getElementById('gcashScreenshotPreview').style.display = 'block';
            document.getElementById('gcashOverlayConfirm').disabled = false;
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('gcashOverlayConfirm').onclick = function () {
        const file = document.getElementById('gcashScreenshotInput').files[0];
        if (!file) return;
        gcashScreenshotFile = file;
        gcashOverlay.style.display = 'none';
        const statusEl = document.getElementById('cartGcashProofStatus');
        statusEl.innerHTML = `<div class="alert alert-success py-2 mb-0 d-flex align-items-center">
            <i class="fa-solid fa-circle-check text-success me-2"></i>
            <span class="flex-fill text-truncate">Screenshot attached: <strong>${file.name}</strong></span>
            <button type="button" id="cartGcashProofRemoveBtn" class="btn btn-sm btn-outline-danger ms-2 py-0">Remove</button>
        </div>`;
        statusEl.style.display = 'block';
        document.getElementById('cartGcashProofRemoveBtn').onclick = function () {
            gcashScreenshotFile = null;
            statusEl.style.display = 'none';
        };
    };

    document.getElementById('cartPaymentMethod').addEventListener('change', function () {
        const sec = document.getElementById('cartGcashPaySection');
        if (this.value === 'GCASH') {
            sec.style.display = 'block';
        } else {
            sec.style.display = 'none';
            gcashScreenshotFile = null;
            document.getElementById('cartGcashProofStatus').style.display = 'none';
        }
    });

    document.getElementById('cartGcashPayBtn').addEventListener('click', openGcashOverlayCart);

    // Delivery fee helpers
    function setCartGeoStatus(state) {
        const icon = document.querySelector('#cartGeocodeStatus i');
        const hint = document.getElementById('cartGeocodeHint');
        const map = {
            loading: ['fa-solid fa-spinner fa-spin text-secondary', '<span class="text-secondary">Locating address…</span>'],
            ok:      ['fa-solid fa-circle-check text-success',       '<span class="text-success">Location found — fee calculated below.</span>'],
            error:   ['fa-solid fa-circle-xmark text-danger',        '<span class="text-danger">Address not found. Try a more specific address or use the map.</span>'],
            idle:    ['fa-solid fa-location-dot text-muted',         'Type your address, or use the buttons below to set your location.']
        };
        const [cls, msg] = map[state] || map.idle;
        icon.className = cls;
        hint.innerHTML = msg;
    }

    function applyCartCoords(lat, lng) {
        const straightKm = haversineKm(STORE_LAT, STORE_LNG, lat, lng);
        currentDeliveryKm = straightKm * ROAD_FACTOR;
        currentDeliveryFee = calcLalamoveFee(currentDeliveryKm);
        renderCartBreakdown();
    }

    function renderCartBreakdown() {
        const bd = document.getElementById('cartDeliveryFeeBreakdown');
        if (currentDeliveryFee === null) { bd.style.display = 'none'; return; }
        const grand = cartSubtotal + currentDeliveryFee;
        bd.style.display = 'block';
        document.getElementById('cartBreakdownDistance').textContent = `~${currentDeliveryKm.toFixed(1)} km`;
        document.getElementById('cartBreakdownDelivery').textContent = currentDeliveryFee.toFixed(2);
        document.getElementById('cartBreakdownGrandTotal').textContent = grand.toFixed(2);
    }

    function initCartLeafletMap() {
        if (mapInitialized) { deliveryMap.invalidateSize(); return; }
        mapInitialized = true;

        deliveryMap = L.map('cartDeliveryMap', { zoomControl: true }).setView([STORE_LAT, STORE_LNG], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(deliveryMap);

        const storeIcon = L.divIcon({
            html: `<div style="background:#0ea5e9;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4);"></div>`,
            className: '', iconAnchor: [7, 7]
        });
        L.marker([STORE_LAT, STORE_LNG], { icon: storeIcon, interactive: false })
            .addTo(deliveryMap).bindTooltip("GenTri's Best Store");

        const deliveryIcon = L.divIcon({
            html: `<div style="background:#e74c3c;width:16px;height:16px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4);"></div>`,
            className: '', iconAnchor: [8, 16]
        });
        deliveryMarker = L.marker([STORE_LAT, STORE_LNG], { icon: deliveryIcon, draggable: true, opacity: 0 })
            .addTo(deliveryMap).bindTooltip('Your delivery location');

        deliveryMarker.on('dragend', async () => {
            const { lat, lng } = deliveryMarker.getLatLng();
            await onCartPinSet(lat, lng);
        });

        deliveryMap.on('click', async (e) => {
            deliveryMarker.setLatLng(e.latlng);
            deliveryMarker.setOpacity(1);
            await onCartPinSet(e.latlng.lat, e.latlng.lng);
        });
    }

    async function onCartPinSet(lat, lng) {
        applyCartCoords(lat, lng);
        setCartGeoStatus('loading');
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                { headers: { 'Accept': 'application/json' } }
            );
            const data = await res.json();
            if (data && data.display_name) {
                document.getElementById('cartDeliveryAddress').value = data.display_name;
                setCartGeoStatus('ok');
                return;
            }
        } catch (_) {}
        document.getElementById('cartDeliveryAddress').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setCartGeoStatus('ok');
    }

    function placeCartMarkerAt(lat, lng) {
        if (!mapInitialized) return;
        deliveryMarker.setLatLng([lat, lng]);
        deliveryMarker.setOpacity(1);
        deliveryMap.setView([lat, lng], 16);
    }

    document.getElementById('cartToggleMapBtn').addEventListener('click', () => {
        const section = document.getElementById('cartMapPickerSection');
        const btn = document.getElementById('cartToggleMapBtn');
        if (section.style.display === 'none') {
            section.style.display = 'block';
            btn.innerHTML = '<i class="fa-solid fa-map-location-dot me-1"></i>Hide Map';
            btn.classList.replace('btn-outline-primary', 'btn-primary');
            setTimeout(initCartLeafletMap, 50);
        } else {
            section.style.display = 'none';
            btn.innerHTML = '<i class="fa-solid fa-map-location-dot me-1"></i>Pin on Map';
            btn.classList.replace('btn-primary', 'btn-outline-primary');
        }
    });

    document.getElementById('cartUseGpsBtn').addEventListener('click', () => {
        if (!navigator.geolocation) {
            setCartGeoStatus('error');
            return;
        }
        const btn = document.getElementById('cartUseGpsBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Getting location…';
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                const section = document.getElementById('cartMapPickerSection');
                if (section.style.display === 'none') {
                    document.getElementById('cartToggleMapBtn').click();
                }
                setTimeout(async () => {
                    placeCartMarkerAt(latitude, longitude);
                    await onCartPinSet(latitude, longitude);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-crosshairs me-1"></i>Use My Location';
                }, 150);
            },
            () => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-crosshairs me-1"></i>Use My Location';
                setCartGeoStatus('error');
            }
        );
    });

    document.getElementById('cartDeliveryAddress').addEventListener('input', () => {
        clearTimeout(geocodeTimer);
        const addr = document.getElementById('cartDeliveryAddress').value.trim();
        if (addr.length < 8) {
            currentDeliveryFee = null;
            currentDeliveryKm = null;
            setCartGeoStatus('idle');
            renderCartBreakdown();
            return;
        }
        setCartGeoStatus('loading');
        geocodeTimer = setTimeout(async () => {
            const result = await geocodeAddress(addr);
            if (!result) {
                currentDeliveryFee = null;
                currentDeliveryKm = null;
                setCartGeoStatus('error');
                renderCartBreakdown();
                return;
            }
            applyCartCoords(result.lat, result.lng);
            setCartGeoStatus('ok');
            if (mapInitialized) placeCartMarkerAt(result.lat, result.lng);
        }, 900);
    });

    document.getElementById('confirmCartCheckoutBtn').onclick = function () {
        const deliveryAddress = document.getElementById('cartDeliveryAddress').value.trim();
        const paymentMethod = document.getElementById('cartPaymentMethod').value;
        const notes = document.getElementById('cartOrderNotes').value;

        if (!deliveryAddress) {
            return showModal('Missing Address', 'Please enter your delivery address or pin your location on the map.', 'bg-warning',
                [{ text: 'Ok', class: 'btn btn-warning', dataDismiss: true }]);
        }
        if (currentDeliveryFee === null) {
            return showModal('Address Not Located', 'Delivery fee is still being calculated. Please wait or check your address.', 'bg-warning',
                [{ text: 'Ok', class: 'btn btn-warning', dataDismiss: true }]);
        }
        if (!paymentMethod) {
            return showModal('Missing Payment', 'Please select a payment method.', 'bg-warning',
                [{ text: 'Ok', class: 'btn btn-warning', dataDismiss: true }]);
        }
        if (paymentMethod === 'GCASH' && !gcashScreenshotFile) {
            return showModal('GCash Screenshot Required',
                'Please click <strong>Pay with GCash</strong>, scan the QR code, then upload your screenshot before placing the order.',
                'bg-info text-white',
                [{ text: 'Ok', class: 'btn btn-info', dataDismiss: true }]);
        }

        bootstrapModal.hide();
        processUserCartCheckout(deliveryAddress, currentDeliveryFee, paymentMethod, notes, gcashScreenshotFile);
    };
}

function processUserCartCheckout(deliveryAddress, deliveryFee, paymentMethod, notes, gcashScreenshot) {
    const cartItems = [...userCart];
    userCart = [];
    updateCartBadge();
    displayUserCart();

    // ONE order number shared by every item in this cart checkout
    const orderNumber = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substr(2, 9);

    let processed = 0;
    let failed = 0;
    const failedItems = [];

    const processNextItem = (index) => {
        if (index >= cartItems.length) {
            if (failed === 0) {
                let itemRows = cartItems.map(i =>
                    `<tr><td>${i.productName}</td><td class="text-center">${i.quantity}</td><td class="text-end">₱${i.itemTotal.toFixed(2)}</td></tr>`
                ).join('');
                const grandTotal = cartItems.reduce((s, i) => s + i.itemTotal, 0) + deliveryFee;
                showModal(
                    'Order Placed!',
                    `<p class="mb-3"><i class="fa-solid fa-check-circle text-success me-2"></i><strong>Your order has been placed successfully!</strong></p>
                    <p class="mb-2"><strong>Order #:</strong> <span class="text-sky fw-bold">${orderNumber}</span></p>
                    <div class="table-responsive mb-2">
                        <table class="table table-sm table-bordered mb-0">
                            <thead class="table-light"><tr><th>Product</th><th class="text-center">Qty</th><th class="text-end">Subtotal</th></tr></thead>
                            <tbody>${itemRows}</tbody>
                            <tfoot>
                                <tr class="table-light"><td colspan="2" class="text-muted"><i class="fa-solid fa-motorcycle me-1"></i>Delivery Fee</td><td class="text-end">₱${deliveryFee.toFixed(2)}</td></tr>
                                <tr class="fw-bold"><td colspan="2">Grand Total</td><td class="text-end text-success">₱${grandTotal.toFixed(2)}</td></tr>
                            </tfoot>
                        </table>
                    </div>
                    <p class="mb-1 small"><i class="fa-solid fa-location-dot me-1 text-danger"></i>${deliveryAddress}</p>
                    <p class="mb-0 small"><i class="fa-solid fa-credit-card me-1"></i>${paymentMethod}</p>`,
                    'bg-success',
                    [{ text: 'View Orders', class: 'btn btn-success', dataDismiss: true, onclick: () => {
                        setTimeout(() => { showSection('analytics'); loadOrderHistory(); }, 300);
                    }}]
                );
            } else {
                let msg = `<p>Processed: <strong class="text-success">${processed}</strong> | Failed: <strong class="text-danger">${failed}</strong></p>`;
                if (failedItems.length > 0) {
                    msg += `<ul class="small">` + failedItems.map(fi => `<li><strong>${fi.name}</strong>: ${fi.error}</li>`).join('') + `</ul>`;
                }
                showModal('Order Summary', msg, failed === cartItems.length ? 'bg-danger' : 'bg-warning',
                    [{ text: 'Ok', class: failed === cartItems.length ? 'btn btn-danger' : 'btn btn-warning', dataDismiss: true, onclick: () => {
                        setTimeout(() => { showSection('analytics'); loadOrderHistory(); }, 300);
                    }}]
                );
            }
            return;
        }

        const item = cartItems[index];
        const formData = new FormData();
        formData.append('action', 'place_order');
        formData.append('orderNumber', orderNumber);   // shared number for all items
        formData.append('productId', item.productId);
        formData.append('quantity', item.quantity);
        formData.append('paymentMethod', paymentMethod);
        formData.append('deliveryAddress', deliveryAddress);
        formData.append('deliveryFee', index === 0 ? deliveryFee : 0);  // fee only on first row
        formData.append('notes', notes || '');
        if (index === 0 && gcashScreenshot) {
            formData.append('gcashScreenshot', gcashScreenshot);
        }

        fetch('customer_api.php', { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.success) processed++;
                else { failed++; failedItems.push({ name: item.productName, error: data.error || 'Unknown error' }); }
                processNextItem(index + 1);
            })
            .catch(err => {
                failed++;
                failedItems.push({ name: item.productName, error: err.message });
                processNextItem(index + 1);
            });
    };

    processNextItem(0);
}

// ============================================
// POS FUNCTIONS - POINT OF SALE FOR WALK-IN CUSTOMERS
// ============================================
let allPOSProducts = [];
let posProductsFiltered = [];
let posCart = []; // Shopping cart for POS items
let userCart = []; // Shopping cart for regular users

function loadPOSProducts() {
    // Load products for POS
    fetch('customer_api.php?action=get_available_products')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allPOSProducts = data.products;
                posProductsFiltered = data.products;
                displayPOSProducts(data.products);
                setupPOSSearchListener();
                displayPOSCart(); // Initialize cart display
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

function displayPOSProducts(products) {
    const container = document.getElementById('posProductsContainer');
    const productCount = document.getElementById('posProductCount');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    // Count only products that are in stock (Quantity > 0)
    const availableProducts = products.filter(p => p.Quantity > 0);
    productCount.textContent = `${availableProducts.length} available`;
    
    if (products.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="fa-solid fa-inbox me-2"></i>No products available</div>';
        return;
    }
    
    products.forEach(product => {
        const isOutOfStock = product.Quantity <= 0;
        const regularPrice = parseFloat(product.Price);
        const hasWholesale = product.WholesalePrice && parseFloat(product.WholesalePrice) > 0;
        
        // Stock indicator
        const stockIndicator = `
            <div class="mt-2 p-2 rounded" style="background-color: ${product.Quantity > 5 ? '#d4edda' : '#fff3cd'}; border-left: 4px solid ${product.Quantity > 5 ? '#28a745' : '#ffc107'};">
                <small class="fw-bold" style="color: ${product.Quantity > 5 ? '#155724' : '#856404'};">
                    <i class="fa-solid ${product.Quantity > 5 ? 'fa-check-circle' : 'fa-exclamation-circle'} me-1"></i>
                    ${product.Quantity} unit${product.Quantity !== 1 ? 's' : ''} in stock
                </small>
            </div>
        `;
        
        let priceDisplay = '';
        if (hasWholesale) {
            const wholesalePrice = parseFloat(product.WholesalePrice);
            priceDisplay = `
                <div class="d-flex justify-content-between align-items-center mb-2 pt-2 border-top">
                    <div>
                        <div class="small text-muted mb-1">Regular: <del>₱${regularPrice.toFixed(2)}</del></div>
                        <span class="h5 mb-0 text-success fw-bold">₱${wholesalePrice.toFixed(2)}</span>
                    </div>
                    <span class="badge bg-success">
                        <i class="fa-solid fa-tag me-1"></i>Wholesale
                    </span>
                </div>
                ${stockIndicator}
            `;
        } else {
            priceDisplay = `
                <div class="d-flex justify-content-between align-items-center mb-2 pt-2 border-top">
                    <span class="h5 mb-0 text-sky fw-bold">₱${regularPrice.toFixed(2)}</span>
                </div>
                ${stockIndicator}
            `;
        }
        
        const productCard = document.createElement('div');
        productCard.className = 'col-md-4 mb-4';
        productCard.innerHTML = `
            <div class="card border-0 shadow-sm h-100 ${isOutOfStock ? 'opacity-75' : ''}">
                <div class="card-body product-card-body d-flex flex-column h-100">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title fw-bold">${product.ProductName}</h6>
                        <span class="badge ${product.Quantity > 0 ? 'bg-success' : 'bg-danger'}">
                            ${product.Status}
                        </span>
                    </div>
                    <p class="text-muted small mb-2">${product.Description || 'No description'}</p>
                    <p class="text-muted small">
                        <strong>Category:</strong> ${product.Category || 'N/A'}
                    </p>

                    <div class="mt-auto">
                        ${priceDisplay}
                        <div class="product-button-wrapper mt-2">
                            ${isOutOfStock ? 
                                '<button class="btn btn-secondary w-100" disabled><i class="fa-solid fa-times me-2"></i>Out of Stock</button>' :
                                `<button class="btn btn-sky w-100 btn-order-fixed" onclick="quickAddToCart(${product.ProductID}, '${product.ProductName}', ${product.Price}, ${product.WholesalePrice || 'null'})">
                                    <i class="fa-solid fa-shopping-cart me-2"></i>Add to Cart
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(productCard);
    });
}

function setupPOSSearchListener() {
    const searchInput = document.getElementById('searchPOSProducts');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                posProductsFiltered = allPOSProducts;
            } else {
                posProductsFiltered = allPOSProducts.filter(product => {
                    const name = (product.ProductName || '').toLowerCase();
                    const category = (product.Category || '').toLowerCase();
                    return name.includes(searchTerm) || category.includes(searchTerm);
                });
            }
            
            displayPOSProducts(posProductsFiltered);
        });
    }
}

function quickAddToCart(productId, productName, regularPrice, wholesalePrice) {
    // Quick add with quantity 1 and default payment method (Cash)
    const quantity = 1;
    const paymentMethod = 'Cash';
    
    // Determine unit price based on quantity
    let unitPrice = parseFloat(regularPrice);
    let priceType = 'REGULAR';
    
    if (quantity >= 10 && wholesalePrice && parseFloat(wholesalePrice) > 0) {
        unitPrice = parseFloat(wholesalePrice);
        priceType = 'WHOLESALE';
    }
    
    // Calculate total for this item
    const itemTotal = unitPrice * quantity;
    
    // Create cart item
    const cartItem = {
        id: Date.now(), // Unique ID for cart item (not product ID, allows duplicate products)
        productId: productId,
        productName: productName,
        quantity: quantity,
        regularPrice: parseFloat(regularPrice),
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
        unitPrice: unitPrice,
        priceType: priceType,
        itemTotal: itemTotal,
        paymentMethod: paymentMethod
    };
    
    // Add to cart
    posCart.push(cartItem);
    
    // Update cart display immediately (real-time)
    displayPOSCart();
}

function showPOSOrderModal(productId, productName, price, wholesalePrice) {
    const modal = document.getElementById('adminModal');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    const regularPrice = parseFloat(price);
    const wholesale = wholesalePrice && parseFloat(wholesalePrice) > 0 ? parseFloat(wholesalePrice) : null;
    
    // Set header
    modalHeader.className = 'modal-header bg-sky text-white';
    modalTitle.textContent = 'Add to Cart - POS';
    
    // Create form content
    modalBody.innerHTML = `
        <form id="posOrderForm">
            <div class="mb-3">
                <h6 class="fw-bold">${productName}</h6>
                <div id="posPriceInfo" class="mb-3"></div>
            </div>
            <div class="mb-3">
                <label for="posOrderQuantity" class="form-label fw-medium">Quantity</label>
                <input type="number" class="form-control" id="posOrderQuantity" min="1" value="1" required>
            </div>
            <div id="posTotalPriceDisplay" class="alert alert-info mb-0">
                <strong>Item Total:</strong> ₱<span id="posTotalAmount">0.00</span>
            </div>
        </form>
    `;
    
    // Set footer buttons
    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-sky" id="confirmPOSOrderBtn">Add to Cart</button>
    `;
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Function to update price display
    function updatePOSPriceDisplay() {
        const quantityInput = document.getElementById('posOrderQuantity');
        const priceInfoDiv = document.getElementById('posPriceInfo');
        const totalAmountSpan = document.getElementById('posTotalAmount');
        
        const qty = parseInt(quantityInput.value) || 0;
        let applicablePrice = regularPrice;
        let priceInfoHtml = `<p class="text-muted mb-0">Price: <strong>₱${regularPrice.toFixed(2)}</strong>/unit</p>`;
        
        if (qty >= 10 && wholesale) {
            applicablePrice = wholesale;
            const savings = (regularPrice - wholesale) * qty;
            priceInfoHtml = `
                <div class="mb-2">
                    <p class="text-muted mb-1"><del>Regular: ₱${regularPrice.toFixed(2)}/unit</del></p>
                    <p class="text-success mb-1"><strong>Wholesale: ₱${wholesale.toFixed(2)}/unit</strong></p>
                    <span class="badge bg-success"><i class="fa-solid fa-percentage me-1"></i>Save ₱${savings.toFixed(2)}!</span>
                </div>
            `;
        }
        
        priceInfoDiv.innerHTML = priceInfoHtml;
        const total = qty * applicablePrice;
        totalAmountSpan.textContent = total.toFixed(2);
    }
    
    // Update price on quantity change
    const quantityInput = document.getElementById('posOrderQuantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updatePOSPriceDisplay);
        updatePOSPriceDisplay();
    }
    
    // Handle add to cart
    document.getElementById('confirmPOSOrderBtn').onclick = function() {
        const quantity = parseInt(document.getElementById('posOrderQuantity').value) || 0;
        
        if (!quantity || quantity <= 0) {
            showModal('Error', 'Please enter a valid quantity', 'bg-warning', [
                {text: 'Ok', class: 'btn btn-warning', dataDismiss: true}
            ]);
            return;
        }
        
        // Close modal and add to cart immediately without success message
        bootstrapModal.hide();
        
        // Determine unit price
        let unitPrice = regularPrice;
        let priceType = 'REGULAR';
        
        if (quantity >= 10 && wholesale) {
            unitPrice = wholesale;
            priceType = 'WHOLESALE';
        }
        
        const itemTotal = unitPrice * quantity;
        
        const cartItem = {
            id: Date.now(),
            productId: productId,
            productName: productName,
            quantity: quantity,
            regularPrice: regularPrice,
            wholesalePrice: wholesale,
            unitPrice: unitPrice,
            priceType: priceType,
            itemTotal: itemTotal,
            paymentMethod: 'Cash' // Default payment method
        };
        
        posCart.push(cartItem);
        
        // Update cart display immediately
        displayPOSCart();
    };
}

function addToCart(productId, productName, regularPrice, wholesalePrice, quantity, paymentMethod) {
    // This function is now kept for compatibility but quickAddToCart is used instead
}

function displayPOSCart() {
    const cartContainer = document.getElementById('posCartContainer');
    if (!cartContainer) return;
    
    // Clear existing cart display
    cartContainer.innerHTML = '';
    
    if (posCart.length === 0) {
        cartContainer.innerHTML = '<div class="text-center text-muted py-3"><i class="fa-solid fa-shopping-cart me-2"></i>Cart is empty</div>';
        return;
    }
    
    // Calculate cart totals
    let cartTotal = 0;
    let cartQuantity = 0;
    let commonPaymentMethod = posCart[0].paymentMethod; // Get first item's payment method
    const allSamePayment = posCart.every(item => item.paymentMethod === commonPaymentMethod);
    
    posCart.forEach(item => {
        cartTotal += item.itemTotal;
        cartQuantity += item.quantity;
    });
    
    // Create cart HTML
    let cartHTML = `
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-sky text-white">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0"><i class="fa-solid fa-shopping-cart me-2"></i>Shopping Cart</h6>
                    <span class="badge bg-light text-dark">${posCart.length} item(s)</span>
                </div>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-sm table-hover mb-3">
                        <thead class="table-light">
                            <tr>
                                <th>Product</th>
                                <th class="text-center" style="width: 70px;">Qty</th>
                                <th class="text-end" style="width: 80px;">Unit Price</th>
                                <th class="text-end" style="width: 80px;">Total</th>
                                <th class="text-end" style="width: 80px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    posCart.forEach((item, index) => {
        const priceTypeLabel = item.priceType === 'WHOLESALE' ? '<span class="badge bg-success ms-1">Wholesale</span>' : '';
        cartHTML += `
            <tr>
                <td>
                    <strong>${item.productName}</strong>
                    ${priceTypeLabel}
                </td>
                <td class="text-center">
                    <input type="number" class="form-control form-control-sm" value="${item.quantity}" min="1" 
                           onchange="updateCartItemQuantity(${index}, this.value)" style="width: 60px;">
                </td>
                <td class="text-end">₱${item.unitPrice.toFixed(2)}</td>
                <td class="text-end"><strong>₱${item.itemTotal.toFixed(2)}</strong></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-danger" onclick="removePOSCartItem(${index})" title="Remove">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    cartHTML += `
                        </tbody>
                    </table>
                </div>
                
                <div class="bg-light p-3 rounded mb-3">
                    <label for="posPaymentMethod" class="form-label fw-bold mb-2">
                        <i class="fa-solid fa-credit-card me-2"></i>Payment Method (for all items)
                    </label>
                    <select class="form-select" id="posPaymentMethod" onchange="updateAllCartPaymentMethod(this.value)">
                        <option value="Cash" ${allSamePayment && commonPaymentMethod === 'Cash' ? 'selected' : ''}>
                            <i class="fa-solid fa-money-bill me-1"></i>Cash
                        </option>
                        <option value="GCASH" ${allSamePayment && commonPaymentMethod === 'GCASH' ? 'selected' : ''}>
                            <i class="fa-solid fa-mobile me-1"></i>GCash
                        </option>
                        <option value="Card" ${allSamePayment && commonPaymentMethod === 'Card' ? 'selected' : ''}>
                            <i class="fa-solid fa-credit-card me-1"></i>Card
                        </option>
                    </select>
                    <small class="text-muted d-block mt-2">This payment method will be applied to all items in the cart</small>
                </div>
                
                <div class="border-top pt-3">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="text-muted mb-1"><i class="fa-solid fa-box me-1"></i>Total Items: <strong>${cartQuantity}</strong></p>
                            <p class="text-muted mb-0"><i class="fa-solid fa-list me-1"></i>Cart Items: <strong>${posCart.length}</strong></p>
                        </div>
                        <div class="col-md-6 text-end">
                            <h5 class="mb-3">
                                <i class="fa-solid fa-money-bill-wave me-2"></i>
                                Grand Total: <span class="text-success fw-bold">₱${cartTotal.toFixed(2)}</span>
                            </h5>
                        </div>
                    </div>
                </div>
                
                <div class="d-grid gap-2 mt-3">
                    <button type="button" class="btn btn-danger" onclick="clearPOSCart()">
                        <i class="fa-solid fa-trash-alt me-2"></i>Clear Cart
                    </button>
                    <button type="button" class="btn btn-lg btn-success" onclick="completePOSOrders()">
                        <i class="fa-solid fa-check me-2"></i>Complete All Orders
                    </button>
                </div>
            </div>
        </div>
    `;
    
    cartContainer.innerHTML = cartHTML;
}

function updateCartItemQuantity(index, newQuantity) {
    newQuantity = parseInt(newQuantity) || 1;
    
    if (newQuantity <= 0) {
        removePOSCartItem(index);
        return;
    }
    
    const item = posCart[index];
    item.quantity = newQuantity;
    
    // Recalculate unit price based on new quantity (wholesale qualification)
    let unitPrice = item.regularPrice;
    let priceType = 'REGULAR';
    
    if (newQuantity >= 10 && item.wholesalePrice) {
        unitPrice = item.wholesalePrice;
        priceType = 'WHOLESALE';
    }
    
    item.unitPrice = unitPrice;
    item.priceType = priceType;
    item.itemTotal = unitPrice * newQuantity;
    
    // Update cart display immediately
    displayPOSCart();
}

function updateAllCartPaymentMethod(paymentMethod) {
    // Update payment method for ALL items in cart at once
    posCart.forEach(item => {
        item.paymentMethod = paymentMethod;
    });
    
    // Cart display updates to reflect the change (though the payment selector will stay in place)
    displayPOSCart();
}

function updateCartItemPayment(index, paymentMethod) {
    posCart[index].paymentMethod = paymentMethod;
    // This function is kept for compatibility but updateAllCartPaymentMethod is now used
}

function removePOSCartItem(index) {
    posCart.splice(index, 1);
    displayPOSCart();
}

function clearPOSCart() {
    showModal(
        'Clear Cart',
        '<p class="mb-0">Are you sure you want to clear all items from the cart?</p>',
        'bg-warning',
        [
            {text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true},
            {text: 'Clear', class: 'btn btn-danger', onclick: () => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                if (modal) modal.hide();
                posCart = [];
                displayPOSCart();
            }}
        ]
    );
}

// Editing is now done inline in cart display - editPOSCartItem is deprecated

function completePOSOrders() {
    if (posCart.length === 0) {
        showModal('Empty Cart', '<p class="mb-0">Please add items to the cart before completing the order.</p>', 'bg-warning', [
            {text: 'Ok', class: 'btn btn-warning', dataDismiss: true}
        ]);
        return;
    }
    
    // Show confirmation modal
    let summary = '<div class="table-responsive"><table class="table table-sm"><tbody>';
    let total = 0;
    
    posCart.forEach(item => {
        summary += `<tr><td>${item.productName}</td><td class="text-end">${item.quantity}x ₱${item.unitPrice.toFixed(2)}</td><td class="text-end fw-bold">₱${item.itemTotal.toFixed(2)}</td></tr>`;
        total += item.itemTotal;
    });
    
    summary += `<tr class="table-active"><td colspan="2"><strong>Grand Total:</strong></td><td class="text-end"><strong class="text-success">₱${total.toFixed(2)}</strong></td></tr></tbody></table></div>`;
    
    showModal(
        'Confirm Complete Order',
        `<p class="mb-3"><strong>You are about to process ${posCart.length} item(s):</strong></p>${summary}
        <p class="mb-0 text-muted small"><i class="fa-solid fa-info-circle me-1"></i>This will create separate transactions for each item.</p>`,
        'bg-success',
        [
            {text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true},
            {text: 'Complete Order', class: 'btn btn-success', onclick: () => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                if (modal) modal.hide();
                processAllPOSOrders();
            }}
        ]
    );
}

function processAllPOSOrders() {
    // Process all items in cart as ONE transaction with single receipt
    let processed = 0;
    let failed = 0;
    let failedItems = []; // Track which items failed and why
    const totalItems = posCart.length;
    const cartItems = [...posCart]; // Copy cart
    
    posCart = []; // Clear cart
    displayPOSCart();
    
    // Generate ONE transaction ID for all items
    const transactionId = 'POS-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substr(2, 9);
    
    console.log(`[POS] Starting batch process: ${totalItems} items, TransactionID: ${transactionId}`);
    
    const processNextItem = (index) => {
        if (index >= cartItems.length) {
            // All items processed
            let message = `<p class="mb-2"><i class="fa-solid fa-check-circle text-success me-2"></i><strong>Orders processed!</strong></p>
                           <p class="mb-2">Successfully processed: <strong class="text-success">${processed}</strong> item${processed !== 1 ? 's' : ''}</p>`;
            
            if (failed > 0) {
                message += `<p class="mb-2">Failed: <strong class="text-danger">${failed}</strong></p>`;
                if (failedItems.length > 0) {
                    message += `<div class="alert alert-danger mt-2 p-2" style="font-size: 0.85rem;">
                        <strong>Failed Items:</strong>
                        <ul class="mb-0 ps-3">`;
                    failedItems.forEach(fi => {
                        message += `<li><strong>${fi.name}</strong>: ${fi.error}</li>`;
                    });
                    message += `</ul></div>`;
                }
            }
            
            showModal(
                'Order Completion Summary',
                message,
                failed > 0 ? 'bg-warning' : 'bg-success',
                [{text: 'Continue', class: failed > 0 ? 'btn btn-warning' : 'btn btn-success', dataDismiss: true, onclick: () => {
                    setTimeout(() => loadPOSProducts(), 300);
                }}]
            );
            return;
        }
        
        const item = cartItems[index];
        console.log(`[POS] Processing item ${index + 1}/${totalItems}: ${item.productName} (qty: ${item.quantity}, payment: ${item.paymentMethod})`);
        
        const formData = new FormData();
        formData.append('action', 'pos_order');
        formData.append('productId', item.productId);
        formData.append('quantity', item.quantity);
        formData.append('paymentMethod', item.paymentMethod);
        formData.append('transactionId', transactionId); // Pass the same transaction ID for all items
        
        fetch('customer_api.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log(`[POS] Response status for item ${index + 1}: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                processed++;
                console.log(`[POS] Item ${index + 1} SUCCESS: ${item.productName}`);
            } else {
                failed++;
                const errorMsg = data.error || 'Unknown error';
                failedItems.push({name: item.productName, error: errorMsg});
                console.error(`[POS] Item ${index + 1} FAILED: ${item.productName} - ${errorMsg}`);
            }
            // Process next item
            processNextItem(index + 1);
        })
        .catch(error => {
            failed++;
            failedItems.push({name: item.productName, error: 'Network or parsing error: ' + error.message});
            console.error(`[POS] Item ${index + 1} ERROR: ${error.message}`);
            processNextItem(index + 1);
        });
    };
    
    // Start processing
    processNextItem(0);
}

function loadOrderHistory() {
    // Check if user is admin, manager, or inventory staff - if so, load all orders
    const isAdmin = window.currentUser && ['ADMIN', 'MANAGER', 'INVENTORY', 'FRONT DESK'].includes(window.currentUser.accountType);
    const apiAction = isAdmin ? 'get_all_orders' : 'get_order_history';
    
    console.log('Loading order history - isAdmin:', isAdmin, 'action:', apiAction);

    fetch(`customer_api.php?action=${apiAction}`)
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('API Response:', data);
            if (data.success) {
                displayOrderHistory(data.orders, isAdmin);
                // Store all orders for later use
                window.allOrdersForTab = data.orders;
            } else {
                const tableBody = document.getElementById('orderHistoryTableBody');
                if (tableBody) {
                    const errorMsg = data.error || 'Unknown error';
                    console.error('API Error:', errorMsg);
                    tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Error: ${errorMsg}</td></tr>`;
                }
            }
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            const tableBody = document.getElementById('orderHistoryTableBody');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Error loading order history: ' + error.message + '</td></tr>';
            }
        });
}

function displayOrderHistory(orders, isAdmin = false) {
    const tableBody = document.getElementById('orderHistoryTableBody');
    const orderCount = document.getElementById('orderHistoryCount');
    const headerTitle = document.querySelector('#analyticsSection h5');
    const customerHeaderCol = document.getElementById('customerHeaderCol');
    const searchBarContainer = document.getElementById('searchBarContainer');
    const searchOrdersInput = document.getElementById('searchOrdersInput');
    const clearSearchOrdersBtn = document.getElementById('clearSearchOrdersBtn');
    
    if (!tableBody) return;
    
    // Store all orders globally for filtering
    window.allOrdersData = orders;
    window.isAdminView = isAdmin;
    
    console.log('displayOrderHistory - isAdmin:', isAdmin, 'currentUser:', window.currentUser, 'accountType:', window.currentUser?.accountType);
    
    // Show/hide customer column header based on admin status
    if (customerHeaderCol) {
        customerHeaderCol.style.display = isAdmin ? 'table-cell' : 'none';
    }
    
    // Show/hide search bar for admin view
    if (searchBarContainer) {
        searchBarContainer.style.display = isAdmin ? 'block' : 'none';
    }
    
    // Setup search functionality for admin
    if (isAdmin && searchOrdersInput && clearSearchOrdersBtn && !window.searchListenersSetup) {
        searchOrdersInput.addEventListener('input', filterOrderHistory);
        clearSearchOrdersBtn.addEventListener('click', function() {
            searchOrdersInput.value = '';
            filterOrderHistory();
        });

        window.searchListenersSetup = true;
    }

    // Update header based on user type
    if (headerTitle) {
        headerTitle.innerHTML = isAdmin
            ? '<i class="fa-solid fa-history me-2"></i>Order History'
            : '<i class="fa-solid fa-history me-2"></i>My Order History';
    }
    
    tableBody.innerHTML = '';
    orderCount.textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''}`;
    
    if (orders.length === 0) {
        const colspan = isAdmin ? 8 : 8;
        tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted py-4"><i class="fa-solid fa-inbox me-2"></i>No orders found.</td></tr>`;
        return;
    }
    
    // Group POS orders before rendering
    const groupedOrders = groupPOSOrders(orders);
    renderOrderRows(groupedOrders, isAdmin);
}

function filterOrderHistory() {
    const searchInput = document.getElementById('searchOrdersInput').value.toLowerCase().trim();
    const searchOrdersInfo = document.getElementById('searchOrdersInfo');
    let filteredOrders = window.allOrdersData;
    
    if (searchInput) {
        filteredOrders = window.allOrdersData.filter(order => {
            const orderNumber = order.OrderNumber.toLowerCase();
            const customerName = ((order.UserFullName || order.Username) || '').toLowerCase();
            const productName = order.ProductName.toLowerCase();
            
            return orderNumber.includes(searchInput) || 
                   customerName.includes(searchInput) || 
                   productName.includes(searchInput);
        });
        
        if (searchOrdersInfo) {
            searchOrdersInfo.style.display = 'block';
            document.getElementById('searchOrdersResultText').textContent = filteredOrders.length + ' match' + (filteredOrders.length !== 1 ? 'es' : '');
        }
    } else {
        if (searchOrdersInfo) {
            searchOrdersInfo.style.display = 'none';
        }
    }
    
    const tableBody = document.getElementById('orderHistoryTableBody');
    tableBody.innerHTML = '';
    
    if (filteredOrders.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4"><i class="fa-solid fa-search me-2"></i>No orders match your search.</td></tr>`;
        return;
    }
    
    // Group POS orders before rendering
    const groupedOrders = groupPOSOrders(filteredOrders);
    renderOrderRows(groupedOrders, window.isAdminView);
}

function groupPOSOrders(orders) {
    return groupOrders(orders); // alias kept for compatibility
}

function groupOrders(orders) {
    const grouped = [];
    const orderMap = {};

    orders.forEach(order => {
        const isPOS = order.Username === 'WALKIN_CUSTOMER';
        if (!orderMap[order.OrderNumber]) {
            orderMap[order.OrderNumber] = {
                ...order,
                isPOS: isPOS,
                items: [order]
            };
            grouped.push(orderMap[order.OrderNumber]);
        } else {
            orderMap[order.OrderNumber].items.push(order);
        }
    });

    return grouped;
}

function renderOrderRows(groupedOrders, isAdmin) {
    const tableBody = document.getElementById('orderHistoryTableBody');

    groupedOrders.forEach(groupedOrder => {
        if (groupedOrder.isPOS) {
            renderPOSOrderRow(groupedOrder, tableBody, isAdmin);
        } else if (groupedOrder.items.length > 1) {
            renderGroupedCartOrderRow(groupedOrder, tableBody, isAdmin);
        } else {
            renderRegularOrderRow(groupedOrder.items[0], tableBody, isAdmin);
        }
    });
}

function renderRegularOrderRow(order, tableBody, isAdmin) {
    const row = document.createElement('tr');
    const orderDate = new Date(order.OrderDate);
    const formattedDate = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    
    console.log('Order:', order.OrderNumber, 'Status:', order.Status, 'isAdmin:', isAdmin);
    
    const statusBadge = `<span class="badge ${
        order.Status === 'PENDING' ? 'bg-warning' : 
        order.Status === 'CONFIRMED' ? 'bg-info' : 
        order.Status === 'SHIPPED' ? 'bg-primary' : 
        'bg-success'
    }">${order.Status}</span>`;
    
    // Show appropriate action button based on order status and user role
    let actionBtn;
    if (isAdmin) {
        // Manager/Admin view - show management buttons
        if (order.Status === 'PENDING') {
            actionBtn = `<div class="d-flex gap-2 justify-content-center flex-wrap w-100">
                <button class="btn btn-sm btn-info" onclick="showOrderDetailsModal('${btoa(JSON.stringify(order))}')">
                    <i class="fa-solid fa-eye me-1"></i>View</button>
                <button class="btn btn-sm btn-danger" onclick="showCancelOrderModal(${order.OrderID}, '${order.OrderNumber}', ${order.Quantity})">
                    <i class="fa-solid fa-times me-1"></i>Cancel</button>
                <button class="btn btn-sm btn-primary" onclick="showUpdateStatusModal(${order.OrderID}, '${order.OrderNumber}', 'SHIPPED')">
                    <i class="fa-solid fa-truck me-1"></i>Ship</button>
            </div>`;
        } else if (order.Status === 'SHIPPED') {
            actionBtn = `<div class="d-flex gap-2 justify-content-center flex-wrap w-100">
                <button class="btn btn-sm btn-info" onclick="showOrderDetailsModal('${btoa(JSON.stringify(order))}')">
                    <i class="fa-solid fa-eye me-1"></i>View</button>
                <button class="btn btn-sm btn-danger" onclick="showCancelOrderModal(${order.OrderID}, '${order.OrderNumber}', ${order.Quantity})">
                    <i class="fa-solid fa-times me-1"></i>Cancel</button>
                <button class="btn btn-sm btn-success" onclick="showUpdateStatusModal(${order.OrderID}, '${order.OrderNumber}', 'DELIVERED')">
                    <i class="fa-solid fa-box-open me-1"></i>Confirm Delivery</button>
            </div>`;
        } else {
            actionBtn = `<div class="d-flex gap-2 justify-content-center w-100">
                <button class="btn btn-sm btn-info" onclick="showOrderDetailsModal('${btoa(JSON.stringify(order))}')">
                    <i class="fa-solid fa-eye me-1"></i>View</button>
            </div>`;
        }
    } else {
        // Regular user view - show cancel/delivery and view buttons
        if (order.Status === 'PENDING') {
            actionBtn = `<div class="d-flex gap-2 justify-content-center flex-wrap w-100">
                <button class="btn btn-sm btn-info" onclick="showOrderDetailsModal('${btoa(JSON.stringify(order))}')">
                    <i class="fa-solid fa-eye me-1"></i>Receipt</button>
                <button class="btn btn-sm btn-danger" onclick="showCancelOrderModal(${order.OrderID}, '${order.OrderNumber}', ${order.Quantity})">
                    <i class="fa-solid fa-times me-1"></i>Cancel</button></div>`;
        } else if (order.Status === 'SHIPPED') {
            actionBtn = `<div class="d-flex gap-2 justify-content-center flex-wrap w-100">
                <button class="btn btn-sm btn-info" onclick="showOrderDetailsModal('${btoa(JSON.stringify(order))}')">
                    <i class="fa-solid fa-eye me-1"></i>Receipt</button>
                <button class="btn btn-sm btn-success" onclick="showDeliveryConfirmModal(${order.OrderID}, '${order.OrderNumber}')">
                    <i class="fa-solid fa-box-open me-1"></i>Confirm</button></div>`;
        } else {
            actionBtn = `<div class="d-flex justify-content-center w-100">
                <button class="btn btn-sm btn-info" onclick="showOrderDetailsModal('${btoa(JSON.stringify(order))}')">
                    <i class="fa-solid fa-eye me-1"></i>Receipt</button>
            </div>`;
        }
    }
    
    // Build the row content
    let rowContent = `
        <td><strong>${order.OrderNumber}</strong></td>`;
    
    // Add customer name + phone cell if showing all orders
    if (isAdmin) {
        const customerName = order.UserFullName || order.Username || 'Unknown';
        const phone = order.UserContactNumber
            ? `<div class="text-muted small"><i class="fa-solid fa-phone me-1"></i>${order.UserContactNumber}</div>`
            : '';
        rowContent += `<td><div class="fw-medium">${customerName}</div>${phone}</td>`;
    }
    
    rowContent += `
        <td>${order.ProductName}</td>
        <td>${order.Quantity}</td>
        <td>
            <div class="small">
                <strong>₱${parseFloat(order.UnitPrice).toFixed(2)}</strong>/unit
            </div>
            <div class="text-muted small">
                Total: <strong>₱${parseFloat(order.TotalPrice).toFixed(2)}</strong>
            </div>
        </td>
        <td>${formattedDate}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
    `;
    
    row.innerHTML = rowContent;
    tableBody.appendChild(row);
}

function renderPOSOrderRow(groupedOrder, tableBody, isAdmin) {
    const row = document.createElement('tr');
    const orderDate = new Date(groupedOrder.OrderDate);
    const formattedDate = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    
    // For POS orders, always show "POS" status
    const statusBadge = `<span class="badge bg-success">POS</span>`;
    
    // For POS orders, show only "View Receipt" button
    const actionBtn = `<div class="d-flex justify-content-center w-100">
        <button class="btn btn-sm btn-info" onclick="showPOSReceiptModal('${btoa(JSON.stringify(groupedOrder))}')">
            <i class="fa-solid fa-eye me-1"></i>View</button>
    </div>`;
    
    // Build the row content
    let rowContent = `
        <td><strong>${groupedOrder.OrderNumber}</strong></td>`;
    
    // Add customer name cell if showing all orders (always "Walk-In Customer" for POS)
    if (isAdmin) {
        rowContent += `<td>Walk-In Customer</td>`;
    }
    
    // Show product list for grouped POS order
    const productList = groupedOrder.items.map(item => item.ProductName).join(', ');
    const totalQuantity = groupedOrder.items.reduce((sum, item) => sum + item.Quantity, 0);
    const totalPrice = groupedOrder.items.reduce((sum, item) => sum + parseFloat(item.TotalPrice), 0);
    
    rowContent += `
        <td><small>${productList}</small></td>
        <td>${totalQuantity}</td>
        <td>
            <div class="small">
                <strong>₱${(totalPrice / totalQuantity).toFixed(2)}</strong>/unit avg
            </div>
            <div class="text-muted small">
                Total: <strong>₱${totalPrice.toFixed(2)}</strong>
            </div>
        </td>
        <td>${formattedDate}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
    `;
    
    row.innerHTML = rowContent;
    tableBody.appendChild(row);
}

function renderGroupedCartOrderRow(groupedOrder, tableBody, isAdmin) {
    const row = document.createElement('tr');
    const orderDate = new Date(groupedOrder.OrderDate);
    const formattedDate = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const items = groupedOrder.items;
    const allStatuses = items.map(i => i.Status);
    const uniqueStatuses = [...new Set(allStatuses)];
    // Representative status: if all same use it, else show lowest in workflow
    const workflowOrder = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const repStatus = uniqueStatuses.length === 1
        ? uniqueStatuses[0]
        : workflowOrder.find(s => allStatuses.includes(s)) || allStatuses[0];

    const statusBadge = `<span class="badge ${
        repStatus === 'PENDING'   ? 'bg-warning'  :
        repStatus === 'CONFIRMED' ? 'bg-info'      :
        repStatus === 'SHIPPED'   ? 'bg-primary'   :
        repStatus === 'CANCELLED' ? 'bg-danger'    : 'bg-success'
    }">${repStatus}${uniqueStatuses.length > 1 ? ' *' : ''}</span>`;

    const productList = items.map(i => i.ProductName).join(', ');
    const totalQty    = items.reduce((s, i) => s + parseInt(i.Quantity), 0);
    const grandTotal  = items.reduce((s, i) => s + parseFloat(i.TotalPrice), 0);
    const encoded     = btoa(JSON.stringify(groupedOrder));
    const orderIds    = items.map(i => i.OrderID);
    const allPending  = allStatuses.every(s => s === 'PENDING');
    const allShipped  = allStatuses.every(s => s === 'SHIPPED');

    let actionBtn;
    if (isAdmin) {
        actionBtn = `<div class="d-flex gap-1 justify-content-center flex-wrap">
            <button class="btn btn-sm btn-info" onclick="showCartOrderReceiptModal('${encoded}')">
                <i class="fa-solid fa-eye me-1"></i>View</button>
            ${allPending || allShipped ? `<button class="btn btn-sm btn-danger" onclick="cancelGroupedOrder([${orderIds.join(',')}], '${groupedOrder.OrderNumber}')">
                <i class="fa-solid fa-times me-1"></i>Cancel</button>` : ''}
            ${allPending ? `<button class="btn btn-sm btn-primary" onclick="shipGroupedOrder([${orderIds.join(',')}], '${groupedOrder.OrderNumber}')">
                <i class="fa-solid fa-truck me-1"></i>Ship</button>` : ''}
            ${allShipped ? `<button class="btn btn-sm btn-success" onclick="deliverGroupedOrder([${orderIds.join(',')}], '${groupedOrder.OrderNumber}')">
                <i class="fa-solid fa-box-open me-1"></i>Deliver</button>` : ''}
        </div>`;
    } else {
        actionBtn = `<div class="d-flex gap-1 justify-content-center flex-wrap">
            <button class="btn btn-sm btn-info" onclick="showCartOrderReceiptModal('${encoded}')">
                <i class="fa-solid fa-eye me-1"></i>Receipt</button>
            ${allPending ? `<button class="btn btn-sm btn-danger" onclick="cancelGroupedOrder([${orderIds.join(',')}], '${groupedOrder.OrderNumber}')">
                <i class="fa-solid fa-times me-1"></i>Cancel</button>` : ''}
            ${allShipped ? `<button class="btn btn-sm btn-success" onclick="confirmGroupedDelivery([${orderIds.join(',')}], '${groupedOrder.OrderNumber}')">
                <i class="fa-solid fa-box-open me-1"></i>Confirm</button>` : ''}
        </div>`;
    }

    let rowContent = `<td><strong>${groupedOrder.OrderNumber}</strong><br><span class="badge bg-secondary" style="font-size:0.65rem;">${items.length} items</span></td>`;
    if (isAdmin) {
        const name  = groupedOrder.UserFullName || groupedOrder.Username || 'Unknown';
        const phone = groupedOrder.UserContactNumber
            ? `<div class="text-muted small"><i class="fa-solid fa-phone me-1"></i>${groupedOrder.UserContactNumber}</div>` : '';
        rowContent += `<td><div class="fw-medium">${name}</div>${phone}</td>`;
    }
    rowContent += `
        <td><small>${productList}</small></td>
        <td>${totalQty}</td>
        <td><div class="text-muted small">Total:</div><strong>₱${grandTotal.toFixed(2)}</strong></td>
        <td>${formattedDate}</td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>`;

    row.innerHTML = rowContent;
    tableBody.appendChild(row);
}

function showCartOrderReceiptModal(encodedGroupedOrder) {
    const groupedOrder = JSON.parse(atob(encodedGroupedOrder));
    const items = groupedOrder.items;

    const modal = document.getElementById('adminModal');
    const modalDialog = document.getElementById('adminModalDialog');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');

    modalDialog.className = 'modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable';
    modalHeader.className = 'modal-header bg-sky text-white';
    modalTitle.textContent = `Order Receipt — ${groupedOrder.OrderNumber}`;

    const orderDate = new Date(groupedOrder.OrderDate);
    const formattedDate = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const shippedDateRaw = items.find(i => i.ShippedDate)?.ShippedDate || null;
    const deliveryDateRaw = items.find(i => i.DeliveryDate)?.DeliveryDate || null;
    const formatDT = d => { const dt = new Date(d); return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); };

    const deliveryFee = items.reduce((s, i) => s + (parseFloat(i.DeliveryFee) || 0), 0);
    const itemsSubtotal = items.reduce((s, i) => s + parseFloat(i.TotalPrice), 0) - deliveryFee;
    const grandTotal = itemsSubtotal + deliveryFee;

    const paymentMethod = items[0].PaymentMethod || 'Cash On Delivery';
    const deliveryAddress = items.find(i => i.DeliveryAddress)?.DeliveryAddress || '';
    const notes = items.find(i => i.Notes)?.Notes || '';
    const allStatuses = [...new Set(items.map(i => i.Status))];
    const repStatus = allStatuses.length === 1 ? allStatuses[0] : 'MIXED';

    const paymentIcon = paymentMethod === 'GCASH' ? '<i class="fa-solid fa-mobile text-info me-1"></i>'
        : paymentMethod === 'Card' ? '<i class="fa-solid fa-credit-card text-warning me-1"></i>'
        : '<i class="fa-solid fa-money-bill text-success me-1"></i>';

    const statusColor = repStatus === 'PENDING' ? 'bg-warning' : repStatus === 'CONFIRMED' ? 'bg-info'
        : repStatus === 'SHIPPED' ? 'bg-primary' : repStatus === 'CANCELLED' ? 'bg-danger'
        : repStatus === 'MIXED' ? 'bg-secondary' : 'bg-success';

    let itemRows = items.map(item => {
        const unitPrice = parseFloat(item.UnitPrice);
        const qty = parseInt(item.Quantity);
        const subtotal = parseFloat(item.TotalPrice) - (parseFloat(item.DeliveryFee) || 0);
        const wholesaleBadge = (unitPrice * qty < parseFloat(item.TotalPrice) - (parseFloat(item.DeliveryFee) || 0) + 0.01)
            ? '' : '';
        const itemStatusBadge = allStatuses.length > 1
            ? `<span class="badge ${item.Status === 'PENDING' ? 'bg-warning' : item.Status === 'SHIPPED' ? 'bg-primary' : 'bg-success'} ms-1" style="font-size:0.65rem;">${item.Status}</span>`
            : '';
        return `<tr>
            <td>${item.ProductName}${itemStatusBadge}</td>
            <td class="text-center">${qty}</td>
            <td class="text-end">₱${unitPrice.toFixed(2)}</td>
            <td class="text-end">₱${subtotal.toFixed(2)}</td>
        </tr>`;
    }).join('');

    const customerSection = groupedOrder.UserFullName ? `
        <div class="row mb-3 pb-3 border-bottom">
            <div class="col-md-4"><label class="fw-bold text-muted small">Customer</label><p class="mb-0">${groupedOrder.UserFullName}</p></div>
            <div class="col-md-4"><label class="fw-bold text-muted small">Username</label><p class="mb-0">${groupedOrder.Username}</p></div>
            <div class="col-md-4"><label class="fw-bold text-muted small">Phone</label><p class="mb-0">${groupedOrder.UserContactNumber || '—'}</p></div>
        </div>` : '';

    modalBody.innerHTML = `
        <div class="row mb-3 pb-3 border-bottom">
            <div class="col-md-6">
                <label class="fw-bold text-muted small">Order Number</label>
                <p class="mb-1 fw-bold text-sky">${groupedOrder.OrderNumber}</p>
                <label class="fw-bold text-muted small">Date & Time</label>
                <p class="mb-0">${formattedDate} at ${formattedTime}</p>
            </div>
            <div class="col-md-6">
                <label class="fw-bold text-muted small">Status</label>
                <p class="mb-1"><span class="badge ${statusColor}">${repStatus}</span></p>
                <label class="fw-bold text-muted small">Payment</label>
                <p class="mb-0">${paymentIcon}${paymentMethod}</p>
            </div>
        </div>
        <div class="mb-3 pb-3 border-bottom">
            <label class="fw-bold text-muted small"><i class="fa-solid fa-clock-rotate-left me-1"></i>Order Timeline</label>
            <div class="mt-2 d-flex flex-column gap-1" style="font-size:0.875rem;">
                <div><i class="fa-solid fa-circle-check text-warning me-2"></i><strong>Order Placed:</strong> ${formattedDate} at ${formattedTime}</div>
                <div><i class="fa-solid fa-truck${shippedDateRaw ? ' text-primary' : ' text-muted'} me-2"></i><strong>Shipped:</strong> ${shippedDateRaw ? formatDT(shippedDateRaw) : '<span class="text-muted">Not yet shipped</span>'}</div>
                <div><i class="fa-solid fa-box-open${deliveryDateRaw ? ' text-success' : ' text-muted'} me-2"></i><strong>Delivered:</strong> ${deliveryDateRaw ? formatDT(deliveryDateRaw) : '<span class="text-muted">Not yet delivered</span>'}</div>
            </div>
        </div>
        ${customerSection}
        <div class="mb-3 pb-3 border-bottom">
            <label class="fw-bold text-muted small">Ordered Items</label>
            <div class="table-responsive mt-2">
                <table class="table table-sm table-bordered mb-0">
                    <thead class="table-light">
                        <tr><th>Product</th><th class="text-center">Qty</th><th class="text-end">Unit Price</th><th class="text-end">Subtotal</th></tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                    <tfoot>
                        <tr class="table-light">
                            <td colspan="3" class="text-muted"><i class="fa-solid fa-motorcycle me-1"></i>Delivery Fee</td>
                            <td class="text-end">₱${deliveryFee.toFixed(2)}</td>
                        </tr>
                        <tr class="fw-bold">
                            <td colspan="3">Grand Total</td>
                            <td class="text-end text-success fs-5">₱${grandTotal.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
        ${deliveryAddress ? `
        <div class="mb-3 pb-3 border-bottom">
            <label class="fw-bold text-muted small"><i class="fa-solid fa-location-dot me-1 text-danger"></i>Delivery Address</label>
            <p class="mb-0 mt-1">${deliveryAddress}</p>
        </div>` : ''}
        ${notes ? `
        <div class="mb-2">
            <label class="fw-bold text-muted small">Notes</label>
            <div class="alert alert-light border p-2 mb-0"><p class="mb-0 small">${notes}</p></div>
        </div>` : ''}
    `;

    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" onclick="printCartOrderReceipt('${encodedGroupedOrder}')">
            <i class="fa-solid fa-print me-1"></i>Print Receipt
        </button>`;

    modal.addEventListener('hidden.bs.modal', () => {
        modalDialog.className = 'modal-dialog modal-dialog-centered';
    }, { once: true });

    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

function printCartOrderReceipt(encodedGroupedOrder) {
    const groupedOrder = JSON.parse(atob(encodedGroupedOrder));
    const items = groupedOrder.items;
    const deliveryFee = items.reduce((s, i) => s + (parseFloat(i.DeliveryFee) || 0), 0);
    const grandTotal = items.reduce((s, i) => s + parseFloat(i.TotalPrice), 0);
    const orderDate = new Date(groupedOrder.OrderDate);
    const deliveryAddress = items.find(i => i.DeliveryAddress)?.DeliveryAddress || '';
    const paymentMethod = items[0].PaymentMethod || '';
    const shippedDateRaw2 = items.find(i => i.ShippedDate)?.ShippedDate || null;
    const deliveryDateRaw2 = items.find(i => i.DeliveryDate)?.DeliveryDate || null;
    const fmtDT2 = d => new Date(d).toLocaleString('en-US');

    let itemRows = items.map(i => `
        <tr>
            <td style="padding:4px 8px;">${i.ProductName}</td>
            <td style="padding:4px 8px;text-align:center;">${i.Quantity}</td>
            <td style="padding:4px 8px;text-align:right;">₱${parseFloat(i.UnitPrice).toFixed(2)}</td>
            <td style="padding:4px 8px;text-align:right;">₱${(parseFloat(i.TotalPrice) - (parseFloat(i.DeliveryFee)||0)).toFixed(2)}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><title>Order Receipt ${groupedOrder.OrderNumber}</title>
        <style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#333;}
        h2{color:#0ea5e9;}table{width:100%;border-collapse:collapse;margin:12px 0;}
        th,td{border:1px solid #ddd;padding:6px 8px;}th{background:#f0f9ff;}
        .total{font-weight:bold;background:#f0f9ff;}.footer{margin-top:20px;color:#888;font-size:0.85em;}</style>
        </head><body>
        <h2>GenTri's Best — Order Receipt</h2>
        <p><strong>Order #:</strong> ${groupedOrder.OrderNumber}<br>
        <strong>Date:</strong> ${orderDate.toLocaleString('en-US')}<br>
        <strong>Payment:</strong> ${paymentMethod}</p>
        <table style="width:100%;border-collapse:collapse;margin:8px 0 12px;"><thead><tr><th style="background:#f0f9ff;padding:6px 8px;border:1px solid #ddd;text-align:left;">Milestone</th><th style="background:#f0f9ff;padding:6px 8px;border:1px solid #ddd;text-align:left;">Date & Time</th></tr></thead><tbody>
        <tr><td style="padding:5px 8px;border:1px solid #ddd;">📋 Order Placed</td><td style="padding:5px 8px;border:1px solid #ddd;">${orderDate.toLocaleString('en-US')}</td></tr>
        <tr><td style="padding:5px 8px;border:1px solid #ddd;">🚚 Shipped</td><td style="padding:5px 8px;border:1px solid #ddd;color:${shippedDateRaw2 ? '#004085' : '#999'};">${shippedDateRaw2 ? fmtDT2(shippedDateRaw2) : 'Not yet shipped'}</td></tr>
        <tr><td style="padding:5px 8px;border:1px solid #ddd;">📦 Delivered</td><td style="padding:5px 8px;border:1px solid #ddd;color:${deliveryDateRaw2 ? '#155724' : '#999'};">${deliveryDateRaw2 ? fmtDT2(deliveryDateRaw2) : 'Not yet delivered'}</td></tr>
        </tbody></table>
        <table><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
        <tbody>${itemRows}
        <tr><td colspan="3" style="text-align:right;color:#666;">Delivery Fee</td><td style="text-align:right;">₱${deliveryFee.toFixed(2)}</td></tr>
        <tr class="total"><td colspan="3" style="text-align:right;">Grand Total</td><td style="text-align:right;color:#16a34a;">₱${grandTotal.toFixed(2)}</td></tr>
        </tbody></table>
        ${deliveryAddress ? `<p><strong>Deliver to:</strong> ${deliveryAddress}</p>` : ''}
        <div class="footer">Thank you for shopping at GenTri's Best!</div>
        </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
}

function cancelGroupedOrder(orderIds, orderNumber) {
    showModal(
        'Cancel Order',
        `<p class="mb-2"><strong>Cancel the entire order <span class="text-sky">${orderNumber}</span>?</strong></p>
        <div class="alert alert-warning mb-0">This will cancel all ${orderIds.length} item(s) and restore stock.</div>`,
        'bg-warning',
        [
            { text: 'Keep Order', class: 'btn btn-secondary', dataDismiss: true },
            { text: 'Cancel Order', class: 'btn btn-danger', onclick: () => {
                const m = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                if (m) m.hide();
                let done = 0;
                const cancelNext = (index) => {
                    if (index >= orderIds.length) {
                        showModal('Order Cancelled', `<p class="mb-0">Order <strong>${orderNumber}</strong> has been cancelled and stock restored.</p>`, 'bg-success',
                            [{ text: 'Ok', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadOrderHistory, 300) }]);
                        return;
                    }
                    const fd = new FormData();
                    fd.append('action', 'cancel_order');
                    fd.append('orderId', orderIds[index]);
                    fetch('customer_api.php', { method: 'POST', body: fd })
                        .then(r => r.json())
                        .then(() => { done++; cancelNext(index + 1); })
                        .catch(() => cancelNext(index + 1));
                };
                cancelNext(0);
            }}
        ]
    );
}

function shipGroupedOrder(orderIds, orderNumber) {
    showModal(
        'Ship Order',
        `<p class="mb-0">Mark order <strong>${orderNumber}</strong> as shipped?</p>`,
        'bg-primary',
        [
            { text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true },
            { text: 'Mark as Shipped', class: 'btn btn-primary', onclick: () => {
                const m = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                if (m) m.hide();
                const shipNext = (index) => {
                    if (index >= orderIds.length) {
                        showModal('Shipped', `<p class="mb-0">Order <strong>${orderNumber}</strong> marked as shipped!</p>`, 'bg-success',
                            [{ text: 'Ok', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadOrderHistory, 300) }]);
                        return;
                    }
                    const fd = new FormData();
                    fd.append('action', 'update_order_status');
                    fd.append('orderId', orderIds[index]);
                    fd.append('status', 'SHIPPED');
                    fetch('customer_api.php', { method: 'POST', body: fd })
                        .then(r => r.json())
                        .then(data => {
                            if (!data.success) console.error('Ship failed:', data.error);
                            shipNext(index + 1);
                        })
                        .catch(() => shipNext(index + 1));
                };
                shipNext(0);
            }}
        ]
    );
}

function deliverGroupedOrder(orderIds, orderNumber) {
    showModal(
        'Mark as Delivered',
        `<p class="mb-0">Mark order <strong>${orderNumber}</strong> as delivered?</p>`,
        'bg-success',
        [
            { text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true },
            { text: 'Mark as Delivered', class: 'btn btn-success', onclick: () => {
                const m = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                if (m) m.hide();
                const deliverNext = (index) => {
                    if (index >= orderIds.length) {
                        showModal('Delivered', `<p class="mb-0">Order <strong>${orderNumber}</strong> marked as delivered!</p>`, 'bg-success',
                            [{ text: 'Ok', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadOrderHistory, 300) }]);
                        return;
                    }
                    const fd = new FormData();
                    fd.append('action', 'update_order_status');
                    fd.append('orderId', orderIds[index]);
                    fd.append('status', 'DELIVERED');
                    fetch('customer_api.php', { method: 'POST', body: fd })
                        .then(r => r.json())
                        .then(data => {
                            if (!data.success) console.error('Deliver failed:', data.error);
                            deliverNext(index + 1);
                        })
                        .catch(() => deliverNext(index + 1));
                };
                deliverNext(0);
            }}
        ]
    );
}

function confirmGroupedDelivery(orderIds, orderNumber) {
    showModal(
        'Confirm Delivery',
        `<p class="mb-0">Confirm delivery for order <strong>${orderNumber}</strong>?</p>`,
        'bg-success',
        [
            { text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true },
            { text: 'Confirm Delivery', class: 'btn btn-success', onclick: () => {
                const m = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                if (m) m.hide();
                const confirmNext = (index) => {
                    if (index >= orderIds.length) {
                        showModal('Delivered', `<p class="mb-0">Order <strong>${orderNumber}</strong> marked as delivered!</p>`, 'bg-success',
                            [{ text: 'Ok', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadOrderHistory, 300) }]);
                        return;
                    }
                    const fd = new FormData();
                    fd.append('action', 'confirm_delivery');
                    fd.append('orderId', orderIds[index]);
                    fetch('customer_api.php', { method: 'POST', body: fd })
                        .then(r => r.json())
                        .then(() => confirmNext(index + 1))
                        .catch(() => confirmNext(index + 1));
                };
                confirmNext(0);
            }}
        ]
    );
}

function showOrderDetailsModal(encodedOrder) {
    // Decode the order data from base64
    const order = JSON.parse(atob(encodedOrder));
    
    const modal = document.getElementById('adminModal');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    // Set header
    modalHeader.className = 'modal-header bg-sky text-white';
    modalTitle.textContent = `Order Details - ${order.OrderNumber}`;
    
    // Format date
    const orderDate = new Date(order.OrderDate);
    const formattedDate = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Get payment method icon
    let paymentMethodIcon = '';
    let paymentMethodDisplay = order.PaymentMethod || 'Cash On Delivery';
    if (paymentMethodDisplay === 'Cash On Delivery') {
        paymentMethodIcon = '<i class="fa-solid fa-money-bill text-success me-2"></i>';
    } else if (paymentMethodDisplay === 'GCASH') {
        paymentMethodIcon = '<i class="fa-solid fa-mobile text-info me-2"></i>';
    } else if (paymentMethodDisplay === 'Card') {
        paymentMethodIcon = '<i class="fa-solid fa-credit-card text-warning me-2"></i>';
    }
    
    // Get status badge color
    const statusBadgeColor = {
        'PENDING': 'bg-warning',
        'CONFIRMED': 'bg-info',
        'SHIPPED': 'bg-primary',
        'DELIVERED': 'bg-success'
    }[order.Status] || 'bg-secondary';
    
    // Create detailed order information
    modalBody.innerHTML = `
        <div class="order-details">
            <!-- Order Header Info -->
            <div class="row mb-4 pb-3 border-bottom">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="fw-bold text-muted small">Order Number</label>
                        <p class="mb-0 fs-5">${order.OrderNumber}</p>
                    </div>
                    <div class="mb-3">
                        <label class="fw-bold text-muted small">Order Date</label>
                        <p class="mb-0">${formattedDate} at ${formattedTime}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="fw-bold text-muted small">Order Status</label>
                        <p class="mb-0"><span class="badge ${statusBadgeColor} fs-6">${order.Status}</span></p>
                    </div>
                    <div class="mb-3">
                        <label class="fw-bold text-muted small">Payment Method</label>
                        <p class="mb-0">${paymentMethodIcon}${paymentMethodDisplay}</p>
                    </div>
                </div>
            </div>
            
            <!-- Customer Info (if admin) -->
            ${order.UserFullName ? `
            <div class="row mb-4 pb-3 border-bottom">
                <div class="col-md-4">
                    <label class="fw-bold text-muted small">Customer Name</label>
                    <p class="mb-0">${order.UserFullName}</p>
                </div>
                <div class="col-md-4">
                    <label class="fw-bold text-muted small">Username</label>
                    <p class="mb-0">${order.Username}</p>
                </div>
                <div class="col-md-4">
                    <label class="fw-bold text-muted small">
                        <i class="fa-solid fa-phone me-1"></i>Phone Number
                    </label>
                    <p class="mb-0">${order.UserContactNumber || '<span class="text-muted">—</span>'}</p>
                </div>
            </div>
            ` : ''}
            
            <!-- Product Details -->
            <div class="row mb-4 pb-3 border-bottom">
                <div class="col-md-6">
                    <label class="fw-bold text-muted small">Product Name</label>
                    <p class="mb-0 fs-5">${order.ProductName}</p>
                </div>
                <div class="col-md-6">
                    <label class="fw-bold text-muted small">Quantity</label>
                    <p class="mb-0 fs-5">${order.Quantity} unit${order.Quantity !== 1 ? 's' : ''}</p>
                </div>
            </div>
            
            <!-- Pricing Details -->
            ${(() => {
                const deliveryFee = parseFloat(order.DeliveryFee) || 0;
                const total       = parseFloat(order.TotalPrice);
                const subtotal    = total - deliveryFee;
                if (deliveryFee > 0) {
                    return `
                    <div class="row mb-4 pb-3 border-bottom">
                        <div class="col-12">
                            <label class="fw-bold text-muted small">Pricing Breakdown</label>
                            <div class="table-responsive mt-2">
                                <table class="table table-sm mb-0">
                                    <tbody>
                                        <tr>
                                            <td class="text-muted">Unit Price</td>
                                            <td class="text-end">₱${parseFloat(order.UnitPrice).toFixed(2)} × ${order.Quantity}</td>
                                        </tr>
                                        <tr>
                                            <td class="text-muted">Product Subtotal</td>
                                            <td class="text-end">₱${subtotal.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td class="text-muted"><i class="fa-solid fa-motorcycle me-1"></i>Delivery Fee (Lalamove)</td>
                                            <td class="text-end">₱${deliveryFee.toFixed(2)}</td>
                                        </tr>
                                        <tr class="table-light fw-bold">
                                            <td>Grand Total</td>
                                            <td class="text-end text-success fs-5">₱${total.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>`;
                } else {
                    return `
                    <div class="row mb-4 pb-3 border-bottom">
                        <div class="col-md-6">
                            <label class="fw-bold text-muted small">Unit Price</label>
                            <p class="mb-0 fs-5">₱${parseFloat(order.UnitPrice).toFixed(2)}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="fw-bold text-muted small">Total Price</label>
                            <p class="mb-0 fs-5 text-success fw-bold">₱${total.toFixed(2)}</p>
                        </div>
                    </div>`;
                }
            })()}

            <!-- Delivery Location -->
            ${order.DeliveryAddress ? `
            <div class="row mb-4 pb-3 border-bottom">
                <div class="col-12">
                    <label class="fw-bold text-muted small">
                        <i class="fa-solid fa-location-dot me-1 text-danger"></i>Delivery Location
                    </label>
                    <p class="mb-0 mt-1">${order.DeliveryAddress}</p>
                </div>
            </div>
            ` : ''}

            <!-- Notes -->
            ${order.Notes ? `
            <div class="mb-4">
                <label class="fw-bold text-muted small">Order Notes</label>
                <div class="alert alert-light p-3 border">
                    <p class="mb-0">${order.Notes}</p>
                </div>
            </div>
            ` : ''}

            <!-- Additional Info -->
            ${order.DeliveryDate ? `
            <div class="row">
                <div class="col-md-6">
                    <label class="fw-bold text-muted small">Delivery Date</label>
                    <p class="mb-0">${new Date(order.DeliveryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    // Set footer buttons
    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" onclick="printOrderReceipt('${btoa(JSON.stringify(order))}')">
            <i class="fa-solid fa-download me-2"></i>Print Receipt (PDF)
        </button>
    `;
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

function showPOSReceiptModal(encodedGroupedOrder) {
    // Decode the grouped order data from base64
    const groupedOrder = JSON.parse(atob(encodedGroupedOrder));
    
    const modal = document.getElementById('adminModal');
    const modalHeader = document.getElementById('modalHeader');
    const modalTitle = document.getElementById('adminModalLabel');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    // Set header
    modalHeader.className = 'modal-header bg-success text-white';
    modalTitle.textContent = `POS Receipt - ${groupedOrder.OrderNumber}`;
    
    // Format date
    const orderDate = new Date(groupedOrder.OrderDate);
    const formattedDate = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Get payment method icon from first item
    let paymentMethodIcon = '';
    let paymentMethodDisplay = groupedOrder.items[0].PaymentMethod || 'Cash';
    if (paymentMethodDisplay === 'Cash') {
        paymentMethodIcon = '<i class="fa-solid fa-money-bill text-success me-2"></i>';
    } else if (paymentMethodDisplay === 'GCASH') {
        paymentMethodIcon = '<i class="fa-solid fa-mobile text-info me-2"></i>';
    } else if (paymentMethodDisplay === 'Card') {
        paymentMethodIcon = '<i class="fa-solid fa-credit-card text-warning me-2"></i>';
    }
    
    // Calculate totals
    let totalQuantity = 0;
    let totalPrice = 0;
    let itemsHTML = '<table class="table table-sm"><tbody>';
    
    groupedOrder.items.forEach(item => {
        totalQuantity += item.Quantity;
        totalPrice += parseFloat(item.TotalPrice);
        itemsHTML += `
            <tr>
                <td><strong>${item.ProductName}</strong></td>
                <td class="text-end">${item.Quantity}x</td>
                <td class="text-end">₱${parseFloat(item.UnitPrice).toFixed(2)}</td>
                <td class="text-end">₱${parseFloat(item.TotalPrice).toFixed(2)}</td>
            </tr>
        `;
    });
    
    itemsHTML += '</tbody></table>';
    
    // Create POS receipt display
    modalBody.innerHTML = `
        <div class="order-details">
            <div class="text-center mb-4 pb-3 border-bottom">
                <h5 class="mb-2"><i class="fa-solid fa-receipt me-2"></i>POS Receipt</h5>
                <p class="mb-0"><strong>${groupedOrder.OrderNumber}</strong></p>
                <p class="text-muted small mb-0">${formattedDate} ${formattedTime}</p>
            </div>
            
            <!-- Items List -->
            <div class="mb-4">
                <label class="fw-bold text-muted small mb-2">Items Purchased</label>
                ${itemsHTML}
            </div>
            
            <!-- Totals -->
            <div class="row mb-4 pb-3 border-bottom">
                <div class="col-6 text-end">
                    <label class="fw-bold text-muted small">Total Items</label>
                    <p class="mb-0 fs-5"><strong>${totalQuantity}</strong></p>
                </div>
                <div class="col-6 text-end">
                    <label class="fw-bold text-muted small">Total Amount</label>
                    <p class="mb-0 fs-5 text-success fw-bold">₱${totalPrice.toFixed(2)}</p>
                </div>
            </div>
            
            <!-- Payment Method -->
            <div class="row">
                <div class="col-12">
                    <label class="fw-bold text-muted small">Payment Method</label>
                    <p class="mb-0">${paymentMethodIcon}${paymentMethodDisplay}</p>
                </div>
            </div>
        </div>
    `;
    
    // Set footer buttons
    modalFooter.innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-success" onclick="printPOSReceipt('${btoa(JSON.stringify(groupedOrder))}')">
            <i class="fa-solid fa-download me-2"></i>Print Receipt
        </button>
    `;
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

function printPOSReceipt(encodedGroupedOrder) {
    // Decode the grouped order
    const groupedOrder = JSON.parse(atob(encodedGroupedOrder));
    
    // Create printable content
    let printContent = `
        <html>
        <head>
            <title>POS Receipt - ${groupedOrder.OrderNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .receipt { max-width: 400px; margin: 0 auto; }
                h2 { text-align: center; margin: 0 0 10px 0; }
                .receipt-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                .receipt-date { text-align: center; font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .amount-right { text-align: right; }
                .total-row { font-weight: bold; font-size: 14px; }
                .receipt-footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="receipt-header">
                    <h2>Dairy Box GenTri</h2>
                    <p class="receipt-date">POS Receipt</p>
                </div>
                <p><strong>Receipt #:</strong> ${groupedOrder.OrderNumber}</p>
                <p><strong>Date:</strong> ${new Date(groupedOrder.OrderDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date(groupedOrder.OrderDate).toLocaleTimeString()}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th class="amount-right">Qty</th>
                            <th class="amount-right">Price</th>
                            <th class="amount-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    let totalAmount = 0;
    groupedOrder.items.forEach(item => {
        totalAmount += parseFloat(item.TotalPrice);
        printContent += `
                        <tr>
                            <td>${item.ProductName}</td>
                            <td class="amount-right">${item.Quantity}</td>
                            <td class="amount-right">₱${parseFloat(item.UnitPrice).toFixed(2)}</td>
                            <td class="amount-right">₱${parseFloat(item.TotalPrice).toFixed(2)}</td>
                        </tr>
        `;
    });
    
    printContent += `
                    </tbody>
                </table>
                
                <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; margin: 20px 0;">
                    <p class="total-row" style="text-align: right;">TOTAL: ₱${totalAmount.toFixed(2)}</p>
                </div>
                
                <p><strong>Payment Method:</strong> ${groupedOrder.items[0].PaymentMethod || 'Cash'}</p>
                
                <div class="receipt-footer">
                    <p>Thank you for your purchase!</p>
                    <p>Visit us again soon.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Open print dialog
    const printWindow = window.open('', '', 'height=500,width=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Print and close
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

function printOrderReceipt(encodedOrder) {
    // Decode the order data
    const order = JSON.parse(atob(encodedOrder));
    
    // Format dates
    const orderDate = new Date(order.OrderDate);
    const formattedDate = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const fmtDT = d => { const dt = new Date(d); return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); };
    
    // Get payment method display
    let paymentMethodDisplay = order.PaymentMethod || 'Cash On Delivery';
    let paymentMethodEmoji = '💵';
    if (paymentMethodDisplay === 'GCASH') {
        paymentMethodEmoji = '📱';
    } else if (paymentMethodDisplay === 'Card') {
        paymentMethodEmoji = '💳';
    }
    
    // Create receipt HTML for printing
    const receiptHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Receipt - ${order.OrderNumber}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    background-color: #f5f5f5;
                    padding: 20px;
                    line-height: 1.6;
                }
                
                .receipt-container {
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: white;
                    padding: 40px;
                    border: 1px solid #ddd;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                
                .receipt-header {
                    text-align: center;
                    border-bottom: 2px solid #0ea5e9;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                
                .receipt-header h1 {
                    color: #0ea5e9;
                    font-size: 28px;
                    margin-bottom: 5px;
                }
                
                .receipt-header p {
                    color: #666;
                    font-size: 14px;
                }
                
                .order-number {
                    background-color: #e0f2fe;
                    padding: 15px;
                    border-left: 4px solid #0ea5e9;
                    margin-bottom: 20px;
                    border-radius: 4px;
                }
                
                .order-number strong {
                    color: #0ea5e9;
                    font-size: 18px;
                }
                
                .receipt-section {
                    margin-bottom: 25px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #e0e0e0;
                }
                
                .receipt-section:last-child {
                    border-bottom: none;
                }
                
                .section-title {
                    color: #0ea5e9;
                    font-weight: bold;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 10px;
                }
                
                .receipt-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                
                .receipt-row .label {
                    color: #666;
                    font-weight: 500;
                }
                
                .receipt-row .value {
                    color: #333;
                    font-weight: 600;
                }
                
                .product-section {
                    background-color: #f9f9f9;
                    padding: 15px;
                    border-radius: 4px;
                    margin-bottom: 15px;
                }
                
                .product-name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 8px;
                }
                
                .product-rows {
                    font-size: 13px;
                }
                
                .pricing-summary {
                    background-color: #e0f2fe;
                    padding: 20px;
                    border-radius: 4px;
                    margin-top: 20px;
                }
                
                .pricing-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-size: 14px;
                }
                
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 2px solid #0ea5e9;
                    font-size: 18px;
                    font-weight: bold;
                    color: #0ea5e9;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 12px;
                }
                
                .badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                    font-weight: bold;
                    margin-right: 5px;
                }
                
                .badge-success {
                    background-color: #d4edda;
                    color: #155724;
                }
                
                .badge-warning {
                    background-color: #fff3cd;
                    color: #856404;
                }
                
                .badge-info {
                    background-color: #d1ecf1;
                    color: #0c5460;
                }
                
                .badge-primary {
                    background-color: #d6d8db;
                    color: #004085;
                }
                
                .status-badge {
                    padding: 5px 10px;
                    border-radius: 4px;
                }
                
                @media print {
                    body {
                        background-color: white;
                        padding: 0;
                    }
                    
                    .receipt-container {
                        max-width: 100%;
                        box-shadow: none;
                        border: none;
                        margin: 0;
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <!-- Header -->
                <div class="receipt-header">
                    <h1>GenTri's Best</h1>
                    <p>Dairy Box - Order Receipt</p>
                </div>
                
                <!-- Order Number -->
                <div class="order-number">
                    <strong>Order #${order.OrderNumber}</strong>
                </div>
                
                <!-- Order Information -->
                <div class="receipt-section">
                    <div class="section-title">Order Information</div>
                    <div class="receipt-row">
                        <span class="label">Order Date:</span>
                        <span class="value">${formattedDate} at ${formattedTime}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Status:</span>
                        <span class="value"><span class="badge status-badge badge-${
                            order.Status === 'PENDING' ? 'warning' :
                            order.Status === 'CONFIRMED' ? 'info' :
                            order.Status === 'SHIPPED' ? 'primary' :
                            'success'
                        }">${order.Status}</span></span>
                    </div>
                </div>

                <!-- Order Timeline -->
                <div class="receipt-section">
                    <div class="section-title">Order Timeline</div>
                    <div class="receipt-row">
                        <span class="label">📋 Order Placed:</span>
                        <span class="value">${formattedDate} at ${formattedTime}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">🚚 Shipped by Manager:</span>
                        <span class="value" style="color:${order.ShippedDate ? '#004085' : '#999'};">${order.ShippedDate ? fmtDT(order.ShippedDate) : 'Not yet shipped'}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">📦 Delivered:</span>
                        <span class="value" style="color:${order.DeliveryDate ? '#155724' : '#999'};">${order.DeliveryDate ? fmtDT(order.DeliveryDate) : 'Not yet delivered'}</span>
                    </div>
                </div>
                
                <!-- Customer Information (if available) -->
                ${order.UserFullName ? `
                <div class="receipt-section">
                    <div class="section-title">Customer Information</div>
                    <div class="receipt-row">
                        <span class="label">Name:</span>
                        <span class="value">${order.UserFullName}</span>
                    </div>
                    <div class="receipt-row">
                        <span class="label">Username:</span>
                        <span class="value">${order.Username}</span>
                    </div>
                    ${order.UserContactNumber ? `
                    <div class="receipt-row">
                        <span class="label">📞 Phone Number:</span>
                        <span class="value">${order.UserContactNumber}</span>
                    </div>` : ''}
                </div>
                ` : ''}
                
                <!-- Product Details -->
                <div class="receipt-section">
                    <div class="section-title">Product Details</div>
                    <div class="product-section">
                        <div class="product-name">${order.ProductName}</div>
                        <div class="product-rows">
                            <div class="receipt-row">
                                <span class="label">Quantity:</span>
                                <span class="value">${order.Quantity} unit${order.Quantity !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="receipt-row">
                                <span class="label">Unit Price:</span>
                                <span class="value">₱${parseFloat(order.UnitPrice).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Pricing Summary -->
                ${(() => {
                    const deliveryFee = parseFloat(order.DeliveryFee) || 0;
                    const total       = parseFloat(order.TotalPrice);
                    const subtotal    = total - deliveryFee;
                    if (deliveryFee > 0) {
                        return `
                        <div class="pricing-summary">
                            <div class="pricing-row">
                                <span class="label">Product Subtotal:</span>
                                <span class="value">₱${subtotal.toFixed(2)}</span>
                            </div>
                            <div class="pricing-row">
                                <span class="label">🛵 Delivery Fee (Lalamove):</span>
                                <span class="value">₱${deliveryFee.toFixed(2)}</span>
                            </div>
                            <div class="total-row">
                                <span>GRAND TOTAL:</span>
                                <span>₱${total.toFixed(2)}</span>
                            </div>
                        </div>`;
                    } else {
                        return `
                        <div class="pricing-summary">
                            <div class="pricing-row">
                                <span class="label">Subtotal:</span>
                                <span class="value">₱${total.toFixed(2)}</span>
                            </div>
                            <div class="total-row">
                                <span>TOTAL:</span>
                                <span>₱${total.toFixed(2)}</span>
                            </div>
                        </div>`;
                    }
                })()}

                <!-- Delivery Location -->
                ${order.DeliveryAddress ? `
                <div class="receipt-section" style="margin-top: 25px;">
                    <div class="section-title">📍 Delivery Location</div>
                    <div style="background-color: #f9f9f9; padding: 12px; border-radius: 4px; font-size: 13px; line-height: 1.5;">
                        ${order.DeliveryAddress}
                    </div>
                </div>
                ` : ''}

                <!-- Payment Method -->
                <div class="receipt-section" style="margin-top: 25px;">
                    <div class="section-title">Payment Information</div>
                    <div class="receipt-row">
                        <span class="label">Payment Method:</span>
                        <span class="value">${paymentMethodEmoji} ${paymentMethodDisplay}</span>
                    </div>
                </div>

                <!-- Order Notes -->
                ${order.Notes ? `
                <div class="receipt-section">
                    <div class="section-title">Order Notes</div>
                    <div style="background-color: #f9f9f9; padding: 10px; border-radius: 4px; font-size: 13px;">
                        ${order.Notes}
                    </div>
                </div>
                ` : ''}
                
                <!-- Footer -->
                <div class="footer">
                    <p>Thank you for your order!</p>
                    <p style="margin-top: 5px;">GenTri's Best - Dairy Box</p>
                    <p style="margin-top: 5px; color: #999;">This is an automated receipt. Please keep for your records.</p>
                </div>
            </div>
            
            <script>
                // Auto-print when document loads
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
    
    // Open print dialog
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
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

function showDeliveryConfirmModal(orderId, orderNumber) {
    showModal(
        'Confirm Delivery',
        `<p class="mb-3"><strong>Have you received this order?</strong></p>
        <p class="mb-0"><strong>Order Number:</strong> ${orderNumber}</p>
        <div class="alert alert-success mt-3 mb-0">
            <i class="fa-solid fa-truck me-2"></i>
            Click "Confirm Delivery" to mark this order as delivered.
        </div>`,
        'bg-success',
        [
            {text: 'Not Yet', class: 'btn btn-secondary', dataDismiss: true},
            {text: 'Confirm Delivery', class: 'btn btn-success', onclick: () => performDeliveryConfirm(orderId)}
        ]
    );
}

function performDeliveryConfirm(orderId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
    if (modal) modal.hide();
    
    const formData = new FormData();
    formData.append('action', 'confirm_delivery');
    formData.append('orderId', orderId);
    
    fetch('customer_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showModal(
                'Delivery Confirmed',
                `<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>Your order has been marked as delivered successfully!</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => {
                    setTimeout(loadOrderHistory, 300);
                }}]
            );
        } else {
            showModal('Error', `Failed to confirm delivery: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to confirm delivery', 'bg-danger', [
            {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
        ]);
    });
}

function showUpdateStatusModal(orderId, orderNumber, newStatus) {
    const statusText = newStatus === 'SHIPPED' ? 'ship' : 'mark as delivered';
    const statusTitle = newStatus === 'SHIPPED' ? 'Ship Order' : 'Mark Order as Delivered';
    const statusIcon = newStatus === 'SHIPPED' ? 'fa-truck' : 'fa-box-open';
    const headerBg = newStatus === 'SHIPPED' ? 'bg-primary' : 'bg-success';
    
    showModal(
        statusTitle,
        `<p class="mb-3"><strong>Are you sure you want to ${statusText} this order?</strong></p>
        <p class="mb-0"><strong>Order Number:</strong> ${orderNumber}</p>
        <div class="alert alert-info mt-3 mb-0">
            <i class="fa-solid ${statusIcon} me-2"></i>
            The customer will be notified of the status change.
        </div>`,
        headerBg,
        [
            {text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true},
            {text: statusTitle, class: newStatus === 'SHIPPED' ? 'btn btn-primary' : 'btn btn-success', onclick: () => performUpdateStatus(orderId, newStatus)}
        ]
    );
}

function performUpdateStatus(orderId, newStatus) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
    if (modal) modal.hide();
    
    const formData = new FormData();
    formData.append('action', 'update_order_status');
    formData.append('orderId', orderId);
    formData.append('status', newStatus);
    
    fetch('customer_api.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const statusMsg = newStatus === 'SHIPPED' ? 'shipped' : 'delivered';
            showModal(
                'Order Updated',
                `<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>Order has been marked as ${statusMsg} successfully!</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => {
                    setTimeout(loadOrderHistory, 300);
                }}]
            );
        } else {
            showModal('Error', `Failed to update order: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to update order status', 'bg-danger', [
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

    if (sectionId === 'settings') {
        loadSettingsData();
    }
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================
function loadSettingsData() {
    const user = window.currentUser;
    if (!user) return;

    const usernameEl     = document.getElementById('settingsUsername');
    const emailEl        = document.getElementById('settingsEmail');
    const contactEl      = document.getElementById('settingsContact');
    const accountTypeEl  = document.getElementById('settingsAccountType');
    const accountTypeRow = document.getElementById('accountTypeField');

    if (usernameEl)    usernameEl.value    = user.username      || '';
    if (emailEl)       emailEl.value       = user.email         || '';
    if (contactEl)     contactEl.value     = user.contactNumber || '';
    if (accountTypeEl) accountTypeEl.value = user.accountType   || 'USER';

    // Only show Account Type field for non-regular users
    if (accountTypeRow) {
        const hidden = ['USER', 'GUEST'].includes(user.accountType);
        accountTypeRow.style.display = hidden ? 'none' : '';
    }

    if (!window.settingsListenersSetup) {
        const editBtn = document.getElementById('editAccountBtn');
        if (editBtn) editBtn.addEventListener('click', showEditAccountModal);

        const changePwBtn = document.getElementById('changePasswordBtn');
        if (changePwBtn) changePwBtn.addEventListener('click', showChangePasswordModal);

        window.settingsListenersSetup = true;
    }
}

function showEditAccountModal() {
    const user = window.currentUser;
    if (!user) return;

    const canChangeUsername = !['USER', 'GUEST'].includes(user.accountType);
    const usernameAttrs = canChangeUsername ? 'maxlength="50"' : 'disabled';

    const formHtml = `
        <div class="mb-3">
            <label class="form-label fw-medium">Username</label>
            <input type="text" class="form-control" id="editUsername" value="${escapeHtml(user.username || '')}" ${usernameAttrs}>
            ${!canChangeUsername ? '<div class="form-text text-muted">Username cannot be changed.</div>' : ''}
        </div>
        <div class="mb-3">
            <label class="form-label fw-medium">Email</label>
            <input type="email" class="form-control" id="editEmail" value="${escapeHtml(user.email || '')}" maxlength="100">
        </div>
        <div class="mb-0">
            <label class="form-label fw-medium">Contact Number</label>
            <input type="tel" class="form-control" id="editContact" value="${escapeHtml(user.contactNumber || '')}" maxlength="20">
        </div>`;

    showModal(
        'Edit Account',
        formHtml,
        'bg-sky',
        [
            { text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true },
            { text: 'Save Changes', class: 'btn btn-sky', onclick: performUpdateAccount }
        ]
    );
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function performUpdateAccount() {
    const username = document.getElementById('editUsername')?.value.trim();
    const email    = document.getElementById('editEmail')?.value.trim();
    const contact  = document.getElementById('editContact')?.value.trim();

    if (!username || !email || !contact) {
        showModal('Error', '<p class="mb-0">All fields are required.</p>', 'bg-danger', [
            { text: 'Ok', class: 'btn btn-danger', dataDismiss: true }
        ]);
        return;
    }

    const formData = new FormData();
    formData.append('action', 'update_account');
    formData.append('username', username);
    formData.append('email', email);
    formData.append('contactNumber', contact);

    fetch('update_user.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                // Refresh cached user data
                window.currentUser = data.user;
                sessionStorage.setItem('userData', JSON.stringify(data.user));
                // Refresh sidebar display
                displayUserData(data.user);
                // Refresh settings fields
                loadSettingsData();
                showModal(
                    'Success',
                    '<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>Account updated successfully!</p>',
                    'bg-success',
                    [{ text: 'Close', class: 'btn btn-success', dataDismiss: true }]
                );
            } else {
                showModal('Error', `<p class="mb-0">${data.error || 'Update failed.'}</p>`, 'bg-danger', [
                    { text: 'Ok', class: 'btn btn-danger', dataDismiss: true }
                ]);
            }
        })
        .catch(() => {
            showModal('Error', '<p class="mb-0">An error occurred. Please try again.</p>', 'bg-danger', [
                { text: 'Ok', class: 'btn btn-danger', dataDismiss: true }
            ]);
        });
}

function showChangePasswordModal() {
    showModal(
        'Change Password',
        `<div class="mb-3">
            <label class="form-label fw-medium">Current Password</label>
            <input type="password" class="form-control" id="currentPassword" placeholder="Enter current password">
        </div>
        <div class="mb-3">
            <label class="form-label fw-medium">New Password</label>
            <input type="password" class="form-control" id="newPassword" placeholder="At least 8 characters">
        </div>
        <div class="mb-0">
            <label class="form-label fw-medium">Confirm New Password</label>
            <input type="password" class="form-control" id="confirmPassword" placeholder="Repeat new password">
        </div>`,
        'bg-danger',
        [
            { text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true },
            { text: 'Change Password', class: 'btn btn-danger', onclick: performChangePassword }
        ]
    );
}

function performChangePassword() {
    const current = document.getElementById('currentPassword')?.value;
    const newPw   = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;

    if (!current || !newPw || !confirm) {
        showModal('Error', '<p class="mb-0">All fields are required.</p>', 'bg-danger', [
            { text: 'Ok', class: 'btn btn-danger', dataDismiss: true }
        ]);
        return;
    }

    if (newPw !== confirm) {
        showModal('Error', '<p class="mb-0">New passwords do not match.</p>', 'bg-danger', [
            { text: 'Ok', class: 'btn btn-danger', dataDismiss: true }
        ]);
        return;
    }

    if (newPw.length < 8) {
        showModal('Error', '<p class="mb-0">New password must be at least 8 characters.</p>', 'bg-danger', [
            { text: 'Ok', class: 'btn btn-danger', dataDismiss: true }
        ]);
        return;
    }

    const formData = new FormData();
    formData.append('action', 'change_password');
    formData.append('current_password', current);
    formData.append('new_password', newPw);
    formData.append('confirm_password', confirm);

    fetch('update_user.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showModal(
                    'Success',
                    '<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>Password changed successfully!</p>',
                    'bg-success',
                    [{ text: 'Close', class: 'btn btn-success', dataDismiss: true }]
                );
            } else {
                showModal('Error', `<p class="mb-0">${data.error || 'Failed to change password.'}</p>`, 'bg-danger', [
                    { text: 'Ok', class: 'btn btn-danger', dataDismiss: true }
                ]);
            }
        })
        .catch(() => {
            showModal('Error', '<p class="mb-0">An error occurred. Please try again.</p>', 'bg-danger', [
                { text: 'Ok', class: 'btn btn-danger', dataDismiss: true }
            ]);
        });
}

// ============================================
// INVENTORY FUNCTIONS
// ============================================
// ============================================
// REPORTS
// ============================================

function loadReports() {
    if (!window.reportListenersSetup) {
        document.querySelectorAll('input[name="reportPeriod"]').forEach(radio => {
            radio.addEventListener('change', () => renderReport(radio.value));
        });
        window.reportListenersSetup = true;
    }

    const tableBody = document.getElementById('reportsTableBody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i>Loading report...</td></tr>';

    fetch('customer_api.php?action=get_all_orders')
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                window.allReportOrders = data.orders;
                const checked = document.querySelector('input[name="reportPeriod"]:checked');
                renderReport(checked ? checked.value : 'today');
            } else {
                if (tableBody) tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Error: ${data.error}</td></tr>`;
            }
        })
        .catch(err => {
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Failed to load report.</td></tr>`;
        });
}

function renderReport(period) {
    const orders = window.allReportOrders || [];
    const now = new Date();
    let filtered;

    if (period === 'today') {
        filtered = orders.filter(o => {
            const d = new Date(o.OrderDate);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        });
    } else if (period === 'weekly') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        filtered = orders.filter(o => new Date(o.OrderDate) >= startOfWeek);
    } else {
        filtered = orders.filter(o => {
            const d = new Date(o.OrderDate);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
    }

    const labels = { today: "Today's Sales Report", weekly: 'Weekly Sales Report', monthly: 'Monthly Sales Report' };
    const titleEl = document.getElementById('reportTitle');
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-file-invoice me-2"></i>${labels[period]}`;

    // Group POS orders so a single transaction isn't split across multiple rows
    const groupedFiltered = groupOrders(filtered);

    // Exclude PENDING and CANCELLED from confirmed revenue; POS orders always count as completed sales
    const completed = filtered.filter(o => o.Username === 'WALKIN_CUSTOMER' || (o.Status !== 'CANCELLED' && o.Status !== 'PENDING'));
    const totalRevenue = completed.reduce((s, o) => s + parseFloat(o.TotalPrice), 0);
    const pendingRevenue = filtered.filter(o => o.Status === 'PENDING' && o.Username !== 'WALKIN_CUSTOMER').reduce((s, o) => s + parseFloat(o.TotalPrice), 0);
    const totalQty = completed.reduce((s, o) => s + parseInt(o.Quantity), 0);
    const completedGroupCount = groupedFiltered.filter(g => g.isPOS || (g.items[0].Status !== 'CANCELLED' && g.items[0].Status !== 'PENDING')).length;
    const avgOrder = completedGroupCount ? totalRevenue / completedGroupCount : 0;

    document.getElementById('reportTotalRevenue').innerHTML =
        `₱${totalRevenue.toFixed(2)}<br><span class="text-muted fw-normal" style="font-size:0.72rem;">+₱${pendingRevenue.toFixed(2)} pending</span>`;
    document.getElementById('reportTotalOrders').textContent = completedGroupCount;
    document.getElementById('reportUnitsSold').textContent = totalQty;
    document.getElementById('reportAvgOrder').textContent = `₱${avgOrder.toFixed(2)}`;
    document.getElementById('reportOrderCount').textContent = `${groupedFiltered.length} order${groupedFiltered.length !== 1 ? 's' : ''}`;

    const tableBody = document.getElementById('reportsTableBody');
    tableBody.innerHTML = '';

    if (groupedFiltered.length === 0) {
        const periodLabel = period === 'today' ? 'today' : period === 'weekly' ? 'this week' : 'this month';
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4"><i class="fa-solid fa-inbox me-2"></i>No orders found for ${periodLabel}.</td></tr>`;
        return;
    }

    const statusColors = { PENDING: 'bg-warning', CONFIRMED: 'bg-info', SHIPPED: 'bg-primary', DELIVERED: 'bg-success', CANCELLED: 'bg-danger' };

    groupedFiltered.forEach(g => {
        const row = document.createElement('tr');
        const date = new Date(g.OrderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        if (g.isPOS) {
            const productList = g.items.map(i => i.ProductName).join(', ');
            const totalQtyGroup = g.items.reduce((s, i) => s + parseInt(i.Quantity), 0);
            const totalPriceGroup = g.items.reduce((s, i) => s + parseFloat(i.TotalPrice), 0);
            row.innerHTML = `
                <td><strong>${g.OrderNumber}</strong></td>
                <td><span class="badge bg-secondary">Walk-In</span></td>
                <td><small>${productList}</small></td>
                <td>${totalQtyGroup}</td>
                <td>—</td>
                <td><strong>₱${totalPriceGroup.toFixed(2)}</strong></td>
                <td>${g.items[0].PaymentMethod || '—'}</td>
                <td>${date}</td>
                <td><span class="badge bg-success">POS</span></td>
            `;
        } else {
            const o = g.items[0];
            if (o.Status === 'CANCELLED') row.classList.add('text-muted');
            const customer = o.UserFullName || o.Username;
            const badge = `<span class="badge ${statusColors[o.Status] || 'bg-secondary'}">${o.Status}</span>`;
            row.innerHTML = `
                <td><strong>${o.OrderNumber}</strong></td>
                <td>${customer}</td>
                <td>${o.ProductName}</td>
                <td>${o.Quantity}</td>
                <td>₱${parseFloat(o.UnitPrice).toFixed(2)}</td>
                <td><strong>₱${parseFloat(o.TotalPrice).toFixed(2)}</strong></td>
                <td>${o.PaymentMethod || '—'}</td>
                <td>${date}</td>
                <td>${badge}</td>
            `;
        }
        tableBody.appendChild(row);
    });
}

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
    
    // Find and display low stock notice
    displayLowStockNotice(products);
    
    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fa-solid fa-inbox me-2"></i>No products found. Add your first product to get started!</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        const isLowStock = product.Quantity < 20;
        const quantityClass = product.Quantity <= 5 ? 'text-danger fw-bold' : 'text-success';
        const wholesalePriceDisplay = product.WholesalePrice ? `₱${parseFloat(product.WholesalePrice).toFixed(2)}` : '<span class="text-muted">-</span>';
        
        // Add background highlighting for low stock products
        if (isLowStock) {
            row.style.backgroundColor = '#fff3cd';
            row.style.borderLeft = '4px solid #ffc107';
        }
        
        row.innerHTML = `
            <td><strong>${product.ProductName}</strong></td>
            <td>${product.Category || 'N/A'}</td>
            <td>₱${parseFloat(product.Price).toFixed(2)}</td>
            <td>${wholesalePriceDisplay}</td>
            <td class="${quantityClass}">
                ${product.Quantity} units
                ${isLowStock ? '<span class="badge bg-warning ms-2"><i class="fa-solid fa-triangle-exclamation me-1"></i>Low Stock</span>' : ''}
            </td>
            <td>
                <button class="btn btn-sm ${product.Status === 'ACTIVE' ? 'btn-success' : 'btn-warning'}" onclick="toggleProductStatus(${product.ProductID}, '${product.ProductName}', '${product.Status}')" style="border: none;">
                    <i class="fa-solid ${product.Status === 'ACTIVE' ? 'fa-check-circle' : 'fa-circle-xmark'} me-1"></i>${product.Status}
                </button>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-info" onclick="editProduct(${product.ProductID}, '${product.ProductName}', '${product.Category || ''}', '${product.Description || ''}', ${product.Price}, ${product.WholesalePrice || 'null'}, ${product.Quantity})">
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

function displayLowStockNotice(products) {
    // Remove existing notice if present
    const existingNotice = document.getElementById('lowStockNotice');
    if (existingNotice) {
        existingNotice.remove();
    }
    
    // Filter products with low stock (< 20 units)
    const lowStockProducts = products.filter(p => p.Quantity < 20);
    
    if (lowStockProducts.length === 0) {
        return;
    }
    
    // Create notice container
    const tableContainer = document.querySelector('.table-responsive');
    if (!tableContainer) return;
    
    const notice = document.createElement('div');
    notice.id = 'lowStockNotice';
    notice.className = 'alert alert-warning mb-3 border-start-4';
    notice.style.borderLeftWidth = '4px';
    notice.style.borderLeftColor = '#ffc107';
    
    // Build low stock products list
    let productsList = '<div class="row g-2 mt-2">';
    lowStockProducts.forEach(product => {
        const stockPercentage = Math.round((product.Quantity / 20) * 100);
        productsList += `
            <div class="col-md-6 col-lg-4">
                <div class="small">
                    <strong>${product.ProductName}</strong>
                    <div class="d-flex align-items-center gap-2 mt-1">
                        <div class="flex-grow-1">
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-warning" role="progressbar" style="width: ${Math.min(stockPercentage, 100)}%"></div>
                            </div>
                        </div>
                        <span class="badge bg-warning">${product.Quantity} units</span>
                    </div>
                </div>
            </div>
        `;
    });
    productsList += '</div>';
    
    notice.innerHTML = `
        <div class="d-flex align-items-start gap-2">
            <i class="fa-solid fa-triangle-exclamation text-warning mt-1" style="font-size: 1.25rem;"></i>
            <div class="flex-grow-1">
                <strong><i class="fa-solid fa-inbox me-2"></i>Low Stock Alert</strong>
                <p class="mb-2 text-muted small">The following ${lowStockProducts.length} product(s) have stock below 20 units:</p>
                ${productsList}
            </div>
        </div>
    `;
    
    // Insert notice before the table
    tableContainer.parentNode.insertBefore(notice, tableContainer);
}

function handleAddProduct() {
    const productName = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const price = document.getElementById('productPrice').value;
    const wholesalePrice = document.getElementById('productWholesalePrice').value;
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
    formData.append('wholesalePrice', wholesalePrice);
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

function editProduct(productId, productName, category, description, price, wholesalePrice, quantity) {
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
            <div class="mb-3">
                <label for="editProductWholesalePrice" class="form-label fw-medium">Wholesale Price <span class="badge bg-info">Optional</span></label>
                <small class="text-muted d-block mb-2">Applied when customer has 10+ orders</small>
                <input type="number" class="form-control" id="editProductWholesalePrice" value="${wholesalePrice || ''}" step="0.01">
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
        const editedWholesalePrice = document.getElementById('editProductWholesalePrice').value;
        const editedQuantity = document.getElementById('editProductQuantity').value;
        
        if (!editedName || !editedPrice || editedQuantity === '') {
            showModal('Validation Error', 'Please fill in all required fields', 'bg-warning', [
                {text: 'Ok', class: 'btn btn-warning', dataDismiss: true}
            ]);
            return;
        }
        
        bootstrapModal.hide();
        performUpdateProduct(productId, editedName, editedCategory, editedDescription, editedPrice, editedWholesalePrice, editedQuantity);
    };
}

function performUpdateProduct(productId, productName, category, description, price, wholesalePrice, quantity) {
    const formData = new FormData();
    formData.append('action', 'update_product');
    formData.append('productId', productId);
    formData.append('productName', productName);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('wholesalePrice', wholesalePrice);
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

function toggleProductStatus(productId, productName, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = currentStatus === 'ACTIVE' ? 'deactivate' : 'activate';
    
    showModal(
        `${action.charAt(0).toUpperCase() + action.slice(1)} Product`,
        `<p class="mb-3"><strong>Are you sure you want to ${action} this product?</strong></p>
        <p class="mb-3"><strong>Product Name:</strong> ${productName}</p>
        <div class="alert ${action === 'deactivate' ? 'alert-warning' : 'alert-info'} mb-0">
            <i class="fa-solid ${action === 'deactivate' ? 'fa-circle-xmark' : 'fa-check-circle'} me-2"></i>
            The product will be ${newStatus === 'ACTIVE' ? 'visible' : 'hidden'} on the product browsing page.
        </div>`,
        action === 'deactivate' ? 'bg-warning' : 'bg-info',
        [
            {text: 'Cancel', class: 'btn btn-secondary', dataDismiss: true},
            {text: `${newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'} Product`, class: action === 'deactivate' ? 'btn btn-warning' : 'btn btn-info', onclick: () => performToggleProductStatus(productId, newStatus)}
        ]
    );
}

function performToggleProductStatus(productId, newStatus) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
    if (modal) modal.hide();
    
    const formData = new FormData();
    formData.append('action', 'toggle_product_status');
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
                `<p class="mb-0"><i class="fa-solid fa-check-circle text-success me-2"></i>${data.message}</p>`,
                'bg-success',
                [{text: 'Close', class: 'btn btn-success', dataDismiss: true, onclick: () => setTimeout(loadInventory, 500)}]
            );
        } else {
            showModal('Error', `Failed to update product status: ${data.error}`, 'bg-danger', [
                {text: 'Ok', class: 'btn btn-danger', dataDismiss: true}
            ]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showModal('Error', 'Failed to update product status', 'bg-danger', [
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
