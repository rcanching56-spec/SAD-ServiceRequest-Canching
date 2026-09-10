let allRequests = [];
let filteredRequests = [];
let deleteRequestId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    
    if (!user && window.location.pathname.includes('index.html')) {
        window.location.href = 'login.html';
        return;
    }
    
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = 'index.html';
        return;
    }
    
    if (user) {
        document.getElementById('userEmail').textContent = user.email;
        await loadRequests();
        updateDashboard();
    }
});

onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await logout();
    window.location.href = 'login.html';
});

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

const modal = document.getElementById('modal');
const deleteModal = document.getElementById('deleteModal');
const requestForm = document.getElementById('requestForm');

document.getElementById('newRequestBtn').addEventListener('click', () => {
    openModal();
});

document.querySelector('.close-modal').addEventListener('click', () => {
    closeModal();
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    closeModal();
});

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (deleteRequestId) {
        await deleteRequest(deleteRequestId);
        deleteModal.style.display = 'none';
        deleteRequestId = null;
    }
});

document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    deleteModal.style.display = 'none';
    deleteRequestId = null;
});

requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('requestId').value;
    
    const requestData = {
        requester_name: document.getElementById('requesterName').value.trim(),
        department: document.getElementById('department').value.trim(),
        category: document.getElementById('category').value,
        description: document.getElementById('description').value.trim(),
        priority: document.getElementById('priority').value,
        status: document.getElementById('status').value
    };
    
    if (!requestData.requester_name) {
        alert('Requester name is required.');
        return;
    }
    if (!requestData.department) {
        alert('Department is required.');
        return;
    }
    if (!requestData.category) {
        alert('Category must be selected.');
        return;
    }
    if (!requestData.description || requestData.description.length < 5) {
        alert('Description must contain sufficient information.');
        return;
    }
    if (!requestData.priority) {
        alert('Priority must be selected.');
        return;
    }
    
    if (id) {
        await updateRequest(id, requestData);
    } else {
        await createRequest(requestData);
    }
    
    closeModal();
});

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('priorityFilter').addEventListener('change', applyFilters);

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
    if (e.target === deleteModal) {
        deleteModal.style.display = 'none';
        deleteRequestId = null;
    }
});

async function loadRequests() {
    const user = await getCurrentUser();
    if (!user) return;
    
    const { data, error } = await supabaseClient
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading requests:', error);
        alert('Failed to load requests: ' + error.message);
        return;
    }
    
    allRequests = data || [];
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    
    filteredRequests = allRequests.filter(request => {
        const matchesSearch = !searchTerm || 
            request.requester_name.toLowerCase().includes(searchTerm) ||
            request.description.toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
        
        return matchesSearch && matchesStatus && matchesPriority;
    });
    
    renderRequests();
}

function renderRequests() {
    const tbody = document.getElementById('requestsBody');
    
    if (filteredRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No requests found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredRequests.map(request => `
        <tr>
            <td>${request.id}</td>
            <td>${escapeHtml(request.requester_name)}</td>
            <td>${escapeHtml(request.department)}</td>
            <td>${escapeHtml(request.category)}</td>
            <td><span class="priority-badge priority-${escapeHtml(request.priority)}">${escapeHtml(request.priority)}</span></td>
            <td><span class="status-badge status-${escapeHtml(request.status).replace(/\s+/g, '-')}">${escapeHtml(request.status)}</span></td>
            <td>${formatDate(request.created_at)}</td>
            <td>
                <button class="btn btn-primary btn-small" onclick="editRequest(${request.id})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="confirmDelete(${request.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function createRequest(requestData) {
    const user = await getCurrentUser();
    if (!user) {
        alert('You must be logged in to create a request.');
        return;
    }
    
    const { data, error } = await supabaseClient
        .from('service_requests')
        .insert([{
            requester_name: requestData.requester_name,
            department: requestData.department,
            category: requestData.category,
            description: requestData.description,
            priority: requestData.priority,
            status: 'Pending',
            user_id: user.id
        }])
        .select();
    
    if (error) {
        console.error('Error creating request:', error);
        alert('Failed to create request: ' + error.message);
        return;
    }
    
    await loadRequests();
    updateDashboard();
}

function editRequest(id) {
    const request = allRequests.find(r => r.id === id);
    if (!request) return;
    
    document.getElementById('requestId').value = request.id;
    document.getElementById('requesterName').value = request.requester_name;
    document.getElementById('department').value = request.department;
    document.getElementById('category').value = request.category;
    document.getElementById('description').value = request.description;
    document.getElementById('priority').value = request.priority;
    document.getElementById('status').value = request.status;
    document.getElementById('statusGroup').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'Edit Service Request';
    
    openModal();
}

async function updateRequest(id, requestData) {
    const { data, error } = await supabaseClient
        .from('service_requests')
        .update({
            requester_name: requestData.requester_name,
            department: requestData.department,
            category: requestData.category,
            description: requestData.description,
            priority: requestData.priority,
            status: requestData.status
        })
        .eq('id', id)
        .select();
    
    if (error) {
        console.error('Error updating request:', error);
        alert('Failed to update request: ' + error.message);
        return;
    }
    
    await loadRequests();
    updateDashboard();
}

function confirmDelete(id) {
    deleteRequestId = id;
    deleteModal.style.display = 'flex';
}

async function deleteRequest(id) {
    const { error } = await supabaseClient
        .from('service_requests')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting request:', error);
        alert('Failed to delete request: ' + error.message);
        return;
    }
    
    await loadRequests();
    updateDashboard();
}

function updateDashboard() {
    const total = allRequests.length;
    const pending = allRequests.filter(r => r.status === 'Pending').length;
    const inProgress = allRequests.filter(r => r.status === 'In Progress').length;
    const completed = allRequests.filter(r => r.status === 'Completed').length;
    
    document.getElementById('totalRequests').textContent = total;
    document.getElementById('pendingRequests').textContent = pending;
    document.getElementById('inProgressRequests').textContent = inProgress;
    document.getElementById('completedRequests').textContent = completed;
}

function openModal() {
    modal.style.display = 'flex';
    if (!document.getElementById('requestId').value) {
        requestForm.reset();
        document.getElementById('statusGroup').style.display = 'none';
        document.getElementById('modalTitle').textContent = 'New Service Request';
    }
}

function closeModal() {
    modal.style.display = 'none';
    requestForm.reset();
    document.getElementById('requestId').value = '';
    document.getElementById('statusGroup').style.display = 'none';
    document.getElementById('modalTitle').textContent = 'New Service Request';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
