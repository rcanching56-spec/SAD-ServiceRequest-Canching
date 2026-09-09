let requests = [];
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userEmail').textContent = user.email;
    await loadRequests();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await window.logout();
        } catch (error) {
            alert('Logout failed: ' + error.message);
        }
    });

    document.getElementById('newRequestBtn').addEventListener('click', () => {
        openModal();
    });

    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('requestForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    document.getElementById('searchInput').addEventListener('input', debounce(loadRequests, 300));
    document.getElementById('statusFilter').addEventListener('change', loadRequests);
    document.getElementById('priorityFilter').addEventListener('change', loadRequests);

    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) {
            closeModal();
        }
    });

    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('deleteModal')) {
            closeDeleteModal();
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadRequests() {
    const user = await window.getCurrentUser();
    if (!user) return;

    let query = window.supabaseClient
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });

    const searchTerm = document.getElementById('searchInput').value.trim();
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;

    if (searchTerm) {
        query = query.or(`requester_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    if (priorityFilter && priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error loading requests:', error);
        alert('Failed to load requests: ' + error.message);
        return;
    }

    requests = data || [];
    renderRequests();
    updateDashboard();
    updateAnalytics();
}

function renderRequests() {
    const tbody = document.getElementById('requestsBody');
    
    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No requests found.</td></tr>';
        return;
    }

    tbody.innerHTML = requests.map(req => `
        <tr>
            <td>${req.id}</td>
            <td>${escapeHtml(req.requester_name)}</td>
            <td>${escapeHtml(req.department)}</td>
            <td>${escapeHtml(req.category)}</td>
            <td><span class="priority-badge priority-${req.priority.toLowerCase()}">${escapeHtml(req.priority)}</span></td>
            <td><span class="status-badge status-${req.status.toLowerCase().replace(' ', '-')}">${escapeHtml(req.status)}</span></td>
            <td>${formatDate(req.created_at)}</td>
            <td class="action-buttons">
                <button class="btn-edit" onclick="window.editRequest(${req.id})">Edit</button>
                <button class="btn-delete" onclick="window.deleteRequest(${req.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function updateDashboard() {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'Pending').length;
    const inProgress = requests.filter(r => r.status === 'In Progress').length;
    const completed = requests.filter(r => r.status === 'Completed').length;

    document.getElementById('totalRequests').textContent = total;
    document.getElementById('pendingRequests').textContent = pending;
    document.getElementById('inProgressRequests').textContent = inProgress;
    document.getElementById('completedRequests').textContent = completed;
}

function updateAnalytics() {
    const categoryCounts = {};
    const priorityCounts = {};

    requests.forEach(req => {
        categoryCounts[req.category] = (categoryCounts[req.category] || 0) + 1;
        priorityCounts[req.priority] = (priorityCounts[req.priority] || 0) + 1;
    });

    const categoryList = document.getElementById('categoryStats');
    const priorityList = document.getElementById('priorityStats');

    categoryList.innerHTML = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => `<li>${escapeHtml(name)} <span>${count}</span></li>`)
        .join('') || '<li>No data</li>';

    priorityList.innerHTML = Object.entries(priorityCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => `<li>${escapeHtml(name)} <span>${count}</span></li>`)
        .join('') || '<li>No data</li>';
}

function openModal(requestId = null) {
    const modal = document.getElementById('modal');
    const form = document.getElementById('requestForm');
    const title = document.getElementById('modalTitle');

    form.reset();
    document.getElementById('requestId').value = '';

    if (requestId) {
        const req = requests.find(r => r.id === requestId);
        if (req) {
            title.textContent = 'Edit Request';
            document.getElementById('requestId').value = req.id;
            document.getElementById('requesterName').value = req.requester_name;
            document.getElementById('department').value = req.department;
            document.getElementById('category').value = req.category;
            document.getElementById('description').value = req.description;
            document.getElementById('priority').value = req.priority;
            document.getElementById('status').value = req.status;
        }
    } else {
        title.textContent = 'New Request';
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const user = await window.getCurrentUser();
    if (!user) {
        alert('You must be logged in to submit requests.');
        return;
    }

    const id = document.getElementById('requestId').value;
    const requesterName = document.getElementById('requesterName').value.trim();
    const department = document.getElementById('department').value.trim();
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value.trim();
    const priority = document.getElementById('priority').value;
    const status = document.getElementById('status').value;

    if (!requesterName || !department || !category || !description || !priority) {
        alert('Please fill in all required fields.');
        return;
    }

    if (description.length < 10) {
        alert('Description must contain at least 10 characters.');
        return;
    }

    try {
        if (id) {
            const { error } = await window.supabaseClient
                .from('service_requests')
                .update({
                    requester_name: requesterName,
                    department: department,
                    category: category,
                    description: description,
                    priority: priority,
                    status: status,
                })
                .eq('id', id);

            if (error) throw error;
        } else {
            const { error } = await window.supabaseClient
                .from('service_requests')
                .insert([{
                    requester_name: requesterName,
                    department: department,
                    category: category,
                    description: description,
                    priority: priority,
                    status: 'Pending',
                    user_id: user.id,
                }]);

            if (error) throw error;
        }

        closeModal();
        await loadRequests();
    } catch (error) {
        alert('Operation failed: ' + error.message);
    }
}

window.editRequest = function(id) {
    openModal(id);
};

window.deleteRequest = function(id) {
    deleteTargetId = id;
    document.getElementById('deleteModal').classList.add('active');
};

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteTargetId = null;
}

async function confirmDelete() {
    if (!deleteTargetId) return;

    try {
        const { error } = await window.supabaseClient
            .from('service_requests')
            .delete()
            .eq('id', deleteTargetId);

        if (error) throw error;

        closeDeleteModal();
        await loadRequests();
    } catch (error) {
        alert('Delete failed: ' + error.message);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
