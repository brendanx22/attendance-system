document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    const roleButtons = document.querySelectorAll('.role-btn');
    const roleInput = document.getElementById('role');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorDisplay = document.getElementById('loginError') || 
                        document.getElementById('error-message');

    // Initialize error display
    if (errorDisplay) {
        errorDisplay.style.display = 'none';
    }

    // Role selection
    if (roleButtons.length && roleInput) {
        roleButtons.forEach(button => {
            button.addEventListener('click', function() {
                roleButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-pressed', 'true');
                roleInput.value = this.dataset.role;
                clearError();
            });
        });
    }

    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearError();

        // Validate inputs
        if (!usernameInput.value.trim() || !passwordInput.value || !roleInput.value) {
            showError('All fields are required');
            return;
        }

        let submitBtn = e.target.querySelector('button[type="submit"]');
        let originalBtnText = submitBtn ? submitBtn.innerHTML : '';

        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
                submitBtn.disabled = true;
            }

            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    password: passwordInput.value,
                    role: roleInput.value
                }),
                credentials: 'include' // Important for session cookies
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }

            const data = await response.json();
            if (data.redirect) {
                window.location.href = data.redirect;
            }

        } catch (error) {
            console.error('Login error:', error);
            showError(error.message || 'Login failed. Please try again.');
            
            // Reset button state
            if (submitBtn) {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        }
    });

    function showError(message) {
        if (errorDisplay) {
            errorDisplay.textContent = message;
            errorDisplay.style.display = 'block';
        }
    }

    function clearError() {
        if (errorDisplay) {
            errorDisplay.textContent = '';
            errorDisplay.style.display = 'none';
        }
    }
});