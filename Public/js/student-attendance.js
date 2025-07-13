document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Show loading state
    showLoadingState();
    
    // Check session first
    const sessionRes = await fetch('/session', {
      credentials: 'include'
    });
    
    if (!sessionRes.ok) throw new Error('Session check failed');
    
    const { user } = await sessionRes.json();
    if (!user || user.role !== 'student') {
      window.location.href = '/';
      return;
    }
    
    // Set user info
    setUserInfo(user);

    // Load initial attendance data
    await loadAttendanceData();
    
    // Setup event listeners
    setupEventListeners();

  } catch (error) {
    console.error('Error:', error);
    showErrorToast('Failed to initialize attendance page');
    showEmptyState();
  }
});

async function loadAttendanceData(month = null) {
  try {
    showLoadingState();
    
    let url = '/student/attendance/data';
    if (month) {
      url += `?month=${month}`;
    }
    
    const response = await fetch(url, {
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load attendance data');
    
    const data = await response.json();
    renderAttendanceTable(data.attendance || []);
    
  } catch (error) {
    console.error('Error loading attendance data:', error);
    showErrorToast('Failed to load attendance records');
    showEmptyState();
  }
}

function renderAttendanceTable(records) {
  const tbody = document.getElementById('attendanceTableBody');
  const emptyState = document.getElementById('noRecordsMessage');
  
  if (!tbody || !emptyState) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = records.map(record => `
    <tr>
      <td>${formatDate(record.date)}</td>
      <td>${record.class_name || 'N/A'}</td>
      <td><span class="badge ${getStatusClass(record.status)}">${record.status}</span></td>
      <td>${record.teacher_name || 'N/A'}</td>
    </tr>
  `).join('');
}

function setupEventListeners() {
  const monthFilter = document.getElementById('monthFilter');
  const exportBtn = document.getElementById('exportBtn');
  
  if (monthFilter) {
    monthFilter.addEventListener('change', async (e) => {
      try {
        await loadAttendanceData(e.target.value);
      } catch (error) {
        console.error('Filter error:', error);
        showErrorToast('Failed to filter records');
      }
    });
  }
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }
}

async function exportData() {
  try {
    const monthFilter = document.getElementById('monthFilter');
    const month = monthFilter ? monthFilter.value : null;
    
    let url = '/student/attendance/export';
    if (month) {
      url += `?month=${month}`;
    }
    
    const response = await fetch(url, {
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Export failed');
    
    const blob = await response.blob();
    const urlObject = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObject;
    a.download = `attendance-records-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(urlObject);
    
  } catch (error) {
    console.error('Export error:', error);
    showErrorToast('Failed to export records');
  }
}

function showLoadingState() {
  const tbody = document.getElementById('attendanceTableBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </td>
      </tr>
    `;
  }
  
  const emptyState = document.getElementById('noRecordsMessage');
  if (emptyState) {
    emptyState.style.display = 'none';
  }
}

function showEmptyState() {
  const tbody = document.getElementById('attendanceTableBody');
  const emptyState = document.getElementById('noRecordsMessage');
  
  if (tbody) tbody.innerHTML = '';
  if (emptyState) emptyState.style.display = 'flex';
}

function setUserInfo(user) {
  const nameElement = document.getElementById('studentName');
  const initialsElement = document.getElementById('studentInitials');
  
  if (nameElement) nameElement.textContent = user.name || 'Student';
  if (initialsElement) {
    initialsElement.textContent = user.name 
      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
      : 'S';
  }
}

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  } catch {
    return dateString;
  }
}

function getStatusClass(status) {
  return status === 'present' ? 'bg-success' :
         status === 'absent' ? 'bg-danger' :
         status === 'late' ? 'bg-warning' : 'bg-secondary';
}

function showErrorToast(message) {
  const toast = document.createElement('div');
  toast.className = 'position-fixed bottom-0 end-0 p-3';
  toast.innerHTML = `
    <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header bg-danger text-white">
        <strong class="me-auto">Error</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}