import { supabaseClient } from './supabase.js';

let currentUser = null;

async function initAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        window.location.href = 'index.html';
    }
}

async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        throw error;
    }

    currentUser = data.user;
    return data;
}

async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        throw error;
    }
    currentUser = null;
    window.location.href = 'login.html';
}

async function getCurrentUser() {
    if (!currentUser) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        currentUser = session?.user || null;
    }
    return currentUser;
}

export { initAuth, login, logout, getCurrentUser };

if (document.getElementById('loginForm')) {
    initAuth().then(() => {
        if (currentUser) {
            window.location.href = 'index.html';
        }
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('loginError');

        try {
            await login(email, password);
            window.location.href = 'index.html';
        } catch (error) {
            errorEl.textContent = error.message || 'Login failed. Please check your credentials.';
        }
    });
}
