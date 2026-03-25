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
        userRoleDisplay.classList.add(accountType === 'ADMIN' ? 'bg-danger' : 'bg-success');
    }

    // Show admin tab if user is admin
    if (userData.accountType === 'ADMIN') {
        const adminTab = document.getElementById('adminNavItem');
        if (adminTab) {
            adminTab.style.display = 'block';
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
