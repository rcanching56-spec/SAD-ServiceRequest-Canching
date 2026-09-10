let currentUser = null;

async function checkSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error('Session check error:', error);
        return false;
    }
    return data.session !== null;
}

async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) {
        throw error;
    }
    
    currentUser = data.user;
    return data;
}

async function signup(email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });
    
    if (error) {
        throw error;
    }
    
    return data;
}

async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Logout error:', error);
    }
    currentUser = null;
}

async function getCurrentUser() {
    if (currentUser) return currentUser;
    
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data.user) {
        return null;
    }
    currentUser = data.user;
    return currentUser;
}

function onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
        } else {
            currentUser = null;
        }
        callback(event, session);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');

            errorDiv.style.display = 'none';

            try {
                await login(email, password);
                window.location.href = 'index.html';
            } catch (error) {
                errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
                errorDiv.style.display = 'block';
            }
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const errorDiv = document.getElementById('signupError');
            const successDiv = document.getElementById('signupSuccess');

            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            try {
                const result = await signup(email, password);
                if (result.user && result.user.identities && result.user.identities.length === 0) {
                    successDiv.textContent = 'Signup successful! You can now log in.';
                    successDiv.style.display = 'block';
                    signupForm.reset();
                    setTimeout(() => {
                        document.getElementById('showLogin').click();
                    }, 1500);
                } else {
                    successDiv.textContent = 'Account created! You can now log in.';
                    successDiv.style.display = 'block';
                    signupForm.reset();
                    setTimeout(() => {
                        document.getElementById('showLogin').click();
                    }, 1500);
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Signup failed. Please try again.';
                errorDiv.style.display = 'block';
            }
        });
    }

    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    const loginFormEl = document.getElementById('loginForm');
    const signupFormEl = document.getElementById('signupForm');
    const backToLoginHint = document.getElementById('backToLoginHint');

    if (showSignup && loginFormEl && signupFormEl) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            loginFormEl.style.display = 'none';
            signupFormEl.style.display = 'block';
            backToLoginHint.style.display = 'block';
        });
    }

    if (showLogin && loginFormEl && signupFormEl) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            signupFormEl.style.display = 'none';
            loginFormEl.style.display = 'block';
            backToLoginHint.style.display = 'none';
        });
    }
});
