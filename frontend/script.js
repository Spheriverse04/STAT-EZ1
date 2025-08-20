const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const resultsSection = document.getElementById('results-section');
const reportContainer = document.getElementById('report-container');
const auditTrailList = document.getElementById('audit-trail');
const downloadLink = document.getElementById('download-link');

// --- Event Listeners for Drag and Drop ---
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        handleFile(fileInput.files[0]);
    }
});

// --- File Handling and API Call ---
async function handleFile(file) {
    uploadStatus.textContent = `Uploading and analyzing ${file.name}...`;
    resultsSection.classList.add('hidden');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('http://127.0.0.1:5001/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server error');
        }

        const result = await response.json();
        displayResults(result);
        uploadStatus.textContent = 'Analysis complete!';

    } catch (error) {
        uploadStatus.textContent = `Error: ${error.message}`;
        uploadStatus.style.color = 'red';
    }
}

// --- Display Results ---
function displayResults(data) {
    // Clear previous results
    reportContainer.innerHTML = '';
    auditTrailList.innerHTML = '';

    // Build Report
    const report = data.report;
    let reportHTML = '<h3>Initial Data Profile</h3>';
    reportHTML += `<p><strong>Rows:</strong> ${report.rows}</p>`;
    reportHTML += `<p><strong>Columns:</strong> ${report.columns}</p>`;
    reportHTML += `<p><strong>Duplicate Rows Found:</strong> ${report.duplicate_rows}</p>`;
    
    const missingValues = Object.entries(report.missing_values);
    if (missingValues.length > 0) {
        reportHTML += '<h4>Missing Values Detected:</h4><ul>';
        missingValues.forEach(([col, count]) => {
            reportHTML += `<li><strong>${col}:</strong> ${count} missing</li>`;
        });
        reportHTML += '</ul>';
    } else {
        reportHTML += '<p><strong>Missing Values:</strong> None detected.</p>';
    }

    reportContainer.innerHTML = reportHTML;

    // Build Audit Trail
    data.audit_trail.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        auditTrailList.appendChild(li);
    });

    // Setup download link
    downloadLink.href = `http://127.0.0.1:5001/download/${data.cleaned_filename}`;
    downloadLink.download = data.cleaned_filename;


    resultsSection.classList.remove('hidden');
}
