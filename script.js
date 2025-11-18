// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, onSnapshot, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyBvudT5fANImtfZbzUqQ7glWUHVTNQF1AA",
      authDomain: "termilink-95380.firebaseapp.com",
      projectId: "termilink-95380",
      storageBucket: "termilink-95380.firebasestorage.app",
      messagingSenderId: "433521910078",
      appId: "1:433521910078:web:67791a302e05bb62ae0c6f",
      measurementId: "G-81MR1ZX5Y1",
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
    const db = getFirestore(app);

// Password Protection Constants
const CORRECT_PASSWORD = "5642";
const AUTH_COOKIE_NAME = "termilink_auth";
const COOKIE_EXPIRATION_DAYS = 7;

// DOM Elements
const passwordProtectionDiv = document.getElementById('passwordProtection');
const passwordInput = document.getElementById('passwordInput');
const loginButton = document.getElementById('loginButton');
const mainContentDiv = document.getElementById('mainContent');

// Firebase Config Modal Elements
const openFirebaseConfigBtn = document.getElementById('openFirebaseConfigBtn');
const firebaseConfigModal = document.getElementById('firebaseConfigModal');
const firebaseConfigOutput = document.getElementById('firebaseConfigOutput');
const closeFirebaseConfigModalBtn = document.getElementById('closeFirebaseConfigModalBtn');
const firebasePythonExample = document.getElementById('firebasePythonExample');

// Firebase config object provided by the user
const FIREBASE_CONFIG_OBJECT = `{
  apiKey: "AIzaSyBvudT5fANImtfZbzUqQ7glWUHVTNQF1AA",
  authDomain: "termilink-95380.firebaseapp.com",
  projectId: "termilink-95380",
  storageBucket: "termilink-95380.firebasestorage.app",
  messagingSenderId: "433521910078",
  appId: "1:433521910078:web:67791a302e05bb62ae0c6f",
  measurementId: "G-81MR1ZX5Y1"
}`;

// Cookie Utilities
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = name + '=; Max-Age=-99999999;';
}

// Authentication Logic
function showMainContent() {
  passwordProtectionDiv.style.display = 'none';
  mainContentDiv.style.display = 'block';
  initializeSampleData(); // Initialize the main app content after authentication
}

function handleLogin() {
  const enteredPassword = passwordInput.value;
  if (enteredPassword === CORRECT_PASSWORD) {
    setCookie(AUTH_COOKIE_NAME, "true", COOKIE_EXPIRATION_DAYS);
    showMainContent();
  } else {
    alert("Incorrect password. Please try again.");
    passwordInput.value = '';
  }
}

function checkAuthentication() {
  if (getCookie(AUTH_COOKIE_NAME) === "true") {
    showMainContent();
  } else {
    passwordProtectionDiv.style.display = 'flex'; // Use flex for centering
    mainContentDiv.style.display = 'none';
  }
}

// Event Listeners
loginButton.addEventListener('click', handleLogin);
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleLogin();
  }
});

// Initial Check on Page Load
checkAuthentication();

    // Data storage
    let projects = {};
    let selectedProjectId = null;
    let recordIdCounter = 1;
    let editingProjectId = null;
    let editingRecordId = null;
    let deleteTargetType = null;
    let deleteTargetId = null;
    let unsubscribeRecords = null; // To store the unsubscribe function for records listener

    // Initialize with sample data
    function initializeSampleData() {
      onSnapshot(collection(db, 'projects'), async (projectSnapshot) => {
        projects = {};
        for (const projectDoc of projectSnapshot.docs) {
          const projectId = projectDoc.id;
          const projectData = projectDoc.data();
          projects[projectId] = { id: projectId, name: projectData.name, records: {} };
        }

        const projectIds = Object.keys(projects);
        selectedProjectId = projectIds.length > 0 ? (selectedProjectId && projects[selectedProjectId] ? selectedProjectId : projectIds[0]) : null;
        renderProjects();
        renderRecords(); // Initial render of records for selected project

        // --- URL API Logic (moved here to ensure projects are loaded) ---
        const urlParams = getUrlParams();

        if (urlParams.action) {
          const action = urlParams.action;
          const projectName = urlParams.project;
          const recordName = urlParams.name;
          const recordValue = urlParams.value;
          const recordId = urlParams.recordId; // For update/delete record

          let feedbackMessage = '';

          try {
            switch (action) {
              case 'createProject':
                if (projectName) {
                  if (projects[projectName]) {
                    feedbackMessage = `Project '${projectName}' already exists.`;
                  } else {
                    await setDoc(doc(db, 'projects', projectName), { name: projectName, records: {} });
                    feedbackMessage = `Project '${projectName}' created.`;
                  }
                } else {
                  feedbackMessage = "Missing project name for createProject.";
                }
                break;

              case 'deleteProject':
                if (projectName) {
                  if (projects[projectName]) {
                    // Delete records first
                    const recordsRef = collection(db, `projects/${projectName}/records`);
                    const recordsSnapshot = await getDocs(recordsRef);
                    for (const recordDoc of recordsSnapshot.docs) {
                      await deleteDoc(doc(db, `projects/${projectName}/records`, recordDoc.id));
                    }
                    await deleteDoc(doc(db, 'projects', projectName));
                    feedbackMessage = `Project '${projectName}' deleted.`;
                  } else {
                    feedbackMessage = `Project '${projectName}' not found.`;
                  }
                } else {
                  feedbackMessage = "Missing project name for deleteProject.";
                }
                break;

              case 'addRecord':
                if (projectName && recordName && recordValue) {
                  if (projects[projectName]) {
                    await addDoc(collection(db, `projects/${projectName}/records`), { name: recordName, value: recordValue });
                    feedbackMessage = `Record '${recordName}' added to project '${projectName}'.`;
                  } else {
                    feedbackMessage = `Project '${projectName}' not found for adding record.`;
                  }
                } else {
                  feedbackMessage = "Missing project name, record name, or record value for addRecord.";
                }
                break;

              case 'updateRecord':
                if (projectName && recordId && recordName && recordValue) {
                  const recordDocRef = doc(db, `projects/${projectName}/records`, recordId);
                  if ((await getDoc(recordDocRef)).exists()) {
                    await updateDoc(recordDocRef, { name: recordName, value: recordValue });
                    feedbackMessage = `Record '${recordId}' in project '${projectName}' updated.`;
                  } else {
                    feedbackMessage = `Record '${recordId}' in project '${projectName}' not found.`;
                  }
                } else {
                  feedbackMessage = "Missing project name, record ID, record name, or record value for updateRecord.";
                }
                break;

              case 'deleteRecord':
                if (projectName && recordId) {
                  const recordDocRef = doc(db, `projects/${projectName}/records`, recordId);
                  if ((await getDoc(recordDocRef)).exists()) {
                    await deleteDoc(recordDocRef);
                    feedbackMessage = `Record '${recordId}' in project '${projectName}' deleted.`;
                  } else {
                    feedbackMessage = `Record '${recordId}' in project '${projectName}' not found.`;
                  }
                } else {
                  feedbackMessage = "Missing project name or record ID for deleteRecord.";
                }
                break;

              default:
                feedbackMessage = `Unknown action: ${action}`;
            }
          } catch (error) {
            console.error("URL API error:", error);
            feedbackMessage = `Error performing action '${action}': ${error.message}`;
          }

          // Display feedback and redirect
          alert(feedbackMessage);
          window.location.href = window.location.origin + window.location.pathname; // Redirect to clean URL
        }
      });
    }

    // Validation
    function validateProjectName(name) {
      if (!name || name.trim() === '') {
        return 'Project name is required';
      }
      if (!/^[a-z]+$/.test(name)) {
        return 'Project name must contain only lowercase letters';
      }
      return null;
    }

    // Render functions
    function renderProjects() {
      const projectsList = document.getElementById('projectsList');
      const projectIds = Object.keys(projects);
      
      projectsList.innerHTML = projectIds.map(id => {
        const project = projects[id];
        const isSelected = id === selectedProjectId;
        return `
          <div class="project-card ${isSelected ? 'selected' : ''}" data-project-id="${id}">
            <div class="project-header">
              <span class="project-name">${project.name}</span>
              <div class="project-actions">
                <button class="btn btn-icon rename-project-btn" data-project-id="${id}" title="Rename"><i class="fas fa-edit"></i></button>
                <button class="btn btn-icon delete-project-btn" data-project-id="${id}" title="Delete"><i class="fas fa-trash"></i></button>
                <button class="btn btn-icon project-api-links-btn" data-project-id="${id}" title="View API Links"><i class="fas fa-link"></i></button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Attach event listeners dynamically
      projectsList.querySelectorAll('.project-card').forEach(card => {
        const projectId = card.dataset.projectId;
        card.addEventListener('click', () => selectProject(projectId));
        card.querySelector('.rename-project-btn').addEventListener('click', (event) => {
          event.stopPropagation();
          openRenameModal(projectId);
        });
        card.querySelector('.delete-project-btn').addEventListener('click', (event) => {
          event.stopPropagation();
          openDeleteProjectModal(projectId);
        });
        card.querySelector('.project-api-links-btn').addEventListener('click', (event) => {
          event.stopPropagation();
          openProjectApiLinksModal(projectId);
        });
      });

      // Update project count
      const count = projectIds.length;
      document.getElementById('projectCount').textContent = `${count} project${count !== 1 ? 's' : ''}`;
    }

    function renderRecords() {
      if (!selectedProjectId || !projects[selectedProjectId]) {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('recordsView').style.display = 'none';
        document.getElementById('mainTitle').textContent = 'Select a project';
        return;
      }

      const project = projects[selectedProjectId];
      document.getElementById('mainTitle').textContent = project.name;
      document.getElementById('emptyState').style.display = 'none';
      document.getElementById('recordsView').style.display = 'block';

      const recordsTableBody = document.getElementById('recordsTableBody');
      recordsTableBody.innerHTML = Object.values(project.records).map(record => `
        <tr>
          <td>${record.id}</td>
          <td>${record.name}</td>
          <td>${record.value}</td>
          <td>
            <div class="record-actions">
              <button class="btn btn-secondary edit-record-btn" data-record-id="${record.id}"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn btn-secondary delete-record-btn" data-record-id="${record.id}"><i class="fas fa-trash"></i> Delete</button>
              <button class="btn btn-secondary record-api-links-btn" data-record-id="${record.id}" data-record-name="${record.name}" data-record-value="${record.value}"><i class="fas fa-link"></i> Links</button>
            </div>
          </td>
        </tr>
      `).join('');

      // Attach event listeners dynamically for record actions
      recordsTableBody.querySelectorAll('.edit-record-btn').forEach(button => {
        const recordId = button.dataset.recordId;
        button.addEventListener('click', () => openEditRecordModal(recordId));
      });

      recordsTableBody.querySelectorAll('.delete-record-btn').forEach(button => {
        const recordId = button.dataset.recordId;
        button.addEventListener('click', () => openDeleteRecordModal(recordId));
      });

      recordsTableBody.querySelectorAll('.record-api-links-btn').forEach(button => {
        const recordId = button.dataset.recordId;
        const recordName = button.dataset.recordName;
        const recordValue = button.dataset.recordValue;
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          openRecordApiLinksModal(selectedProjectId, recordId, recordName, recordValue);
        });
      });
    }

    // Project actions
    function selectProject(projectId) {
      if (unsubscribeRecords) {
        unsubscribeRecords(); // Unsubscribe from previous records listener
      }

      selectedProjectId = projectId;

      if (selectedProjectId) {
        unsubscribeRecords = onSnapshot(collection(db, `projects/${selectedProjectId}/records`), (recordsSnapshot) => {
          projects[selectedProjectId].records = {};
          recordsSnapshot.forEach(recordDoc => {
            projects[selectedProjectId].records[recordDoc.id] = { id: recordDoc.id, ...recordDoc.data() };
          });
          renderRecords();
        });
      } else {
        renderRecords(); // Render empty records if no project is selected
      }
      renderProjects();
    }

    function openNewProjectModal() {
      editingProjectId = null;
      document.getElementById('projectModalTitle').textContent = 'New Project';
      document.getElementById('projectNameInput').value = '';
      document.getElementById('projectNameError').style.display = 'none';
      document.getElementById('projectModal').classList.add('active');
      document.getElementById('projectNameInput').focus();
    }

    function openRenameModal(projectId) {
      editingProjectId = projectId;
      document.getElementById('projectModalTitle').textContent = 'Rename Project';
      document.getElementById('projectNameInput').value = projects[projectId].name;
      document.getElementById('projectNameError').style.display = 'none';
      document.getElementById('projectModal').classList.add('active');
      document.getElementById('projectNameInput').focus();
    }

    function closeProjectModal() {
      document.getElementById('projectModal').classList.remove('active');
      editingProjectId = null;
    }

    function saveProject() {
      const nameInput = document.getElementById('projectNameInput');
      const errorDiv = document.getElementById('projectNameError');
      const name = nameInput.value.trim();

      const error = validateProjectName(name);
      if (error) {
        errorDiv.textContent = error;
        errorDiv.style.display = 'block';
        return;
      }

      if (editingProjectId) {
        // Rename existing project directly with Firestore
        if (name !== editingProjectId) {
          // Delete old project and create new one with existing records
          setDoc(doc(db, 'projects', name), { name: name, records: projects[editingProjectId].records || {} })
            .then(() => {
              deleteDoc(doc(db, 'projects', editingProjectId));
              if (selectedProjectId === editingProjectId) {
                selectedProjectId = name;
              }
              closeProjectModal();
            })
            .catch(error => {
              console.error("Error renaming project:", error);
              errorDiv.textContent = "Error renaming project.";
              errorDiv.style.display = 'block';
            });
        } else {
          // Update existing project name (if only casing changed, for example)
          updateDoc(doc(db, 'projects', editingProjectId), { name: name })
            .then(() => {
              closeProjectModal();
            })
            .catch(error => {
              console.error("Error updating project name:", error);
              errorDiv.textContent = "Error updating project name.";
              errorDiv.style.display = 'block';
            });
        }
      } else {
        // Create new project directly with Firestore
        if (projects[name]) {
          errorDiv.textContent = 'A project with this name already exists';
          errorDiv.style.display = 'block';
          return;
        }

        setDoc(doc(db, 'projects', name), {
          name: name,
          records: {}
        })
        .then(() => {
          selectedProjectId = name;
          closeProjectModal();
        })
        .catch(error => {
          console.error("Error creating new project:", error);
          errorDiv.textContent = "Error creating new project.";
          errorDiv.style.display = 'block';
        });
      }
    }

    function openDeleteProjectModal(projectId) {
      deleteTargetType = 'project';
      deleteTargetId = projectId;
      document.getElementById('deleteConfirmText').textContent =
        `Are you sure you want to delete project '${projects[projectId].name}'?`;
      document.getElementById('deleteModal').classList.add('active');
    }

    function deleteProject() {
      if (deleteTargetType === 'project' && deleteTargetId) {
        deleteDoc(doc(db, 'projects', deleteTargetId))
          .then(() => {
            // No need to find next project here, onSnapshot will handle it.
            closeDeleteModal();
          })
          .catch(error => {
            console.error("Error deleting project:", error);
            alert("Error deleting project.");
          });
      }
    }

    // Record actions
    function openAddRecordModal() {
      if (!selectedProjectId) return;
      
      editingRecordId = null;
      document.getElementById('recordModalTitle').textContent = 'Add New Record';
      document.getElementById('recordNameInput').value = '';
      document.getElementById('recordValueInput').value = '';
      document.getElementById('recordModal').classList.add('active');
      document.getElementById('recordNameInput').focus();
    }

    function openEditRecordModal(recordId) {
      if (!selectedProjectId) return;
      
      const record = Object.values(projects[selectedProjectId].records).find(r => r.id === recordId);
      if (!record) return;

      editingRecordId = recordId;
      document.getElementById('recordModalTitle').textContent = 'Edit Record';
      document.getElementById('recordNameInput').value = record.name;
      document.getElementById('recordValueInput').value = record.value;
      document.getElementById('recordModal').classList.add('active');
      document.getElementById('recordNameInput').focus();
    }

    function closeRecordModal() {
      document.getElementById('recordModal').classList.remove('active');
      editingRecordId = null;
    }

    function saveRecord() {
      if (!selectedProjectId) return;

      const name = document.getElementById('recordNameInput').value.trim();
      const value = document.getElementById('recordValueInput').value.trim();

      if (!name || !value) {
        alert('Please fill in all fields');
        return;
      }

      if (editingRecordId !== null) {
        // Edit existing record
        const record = projects[selectedProjectId].records.find(r => r.id === editingRecordId);
        if (record) {
          updateDoc(doc(db, `projects/${selectedProjectId}/records`, record.id), {
            name,
            value
          })
          .then(() => {
            // Success
          })
          .catch(error => {
            console.error("Error updating record:", error);
            alert("Error updating record.");
          });
        }
      } else {
        // Add new record directly with Firestore
        addDoc(collection(db, `projects/${selectedProjectId}/records`), {
          name,
          value
        })
        .then(() => {
          // Success
        })
        .catch(error => {
          console.error("Error adding new record:", error);
          alert("Error adding new record.");
        });
      }

      closeRecordModal();
    }

    function openDeleteRecordModal(recordId) {
      deleteTargetType = 'record';
      deleteTargetId = recordId;
      const record = Object.values(projects[selectedProjectId].records).find(r => r.id === recordId);
      document.getElementById('deleteConfirmText').textContent =
        `Are you sure you want to delete record '${record.name}'?`;
      document.getElementById('deleteModal').classList.add('active');
    }

    function deleteRecord() {
      if (deleteTargetType === 'record' && deleteTargetId && selectedProjectId) {
        deleteDoc(doc(db, `projects/${selectedProjectId}/records`, deleteTargetId))
          .then(() => {
            closeDeleteModal();
          })
          .catch(error => {
            console.error("Error deleting record:", error);
            alert("Error deleting record.");
          });
      }
    }

    function closeDeleteModal() {
      document.getElementById('deleteModal').classList.remove('active');
      deleteTargetType = null;
      deleteTargetId = null;
    }

    function confirmDelete() {
      if (deleteTargetType === 'project') {
        deleteProject();
      } else if (deleteTargetType === 'record') {
        deleteRecord();
      }
    }

    // Event listeners
    document.getElementById('newProjectBtn').addEventListener('click', openNewProjectModal);
    document.getElementById('cancelProjectBtn').addEventListener('click', closeProjectModal);
    document.getElementById('saveProjectBtn').addEventListener('click', saveProject);
    
    document.getElementById('addRecordBtn').addEventListener('click', openAddRecordModal);
    document.getElementById('cancelRecordBtn').addEventListener('click', closeRecordModal);
    document.getElementById('saveRecordBtn').addEventListener('click', saveRecord);
    
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Handle Enter key in project name input
    document.getElementById('projectNameInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveProject();
      }
    });

    // --- API Links Modals Logic ---
    const projectApiLinksModal = document.getElementById('projectApiLinksModal');
    const recordApiLinksModal = document.getElementById('recordApiLinksModal');
    
    const apiLinkCreateProject = document.getElementById('apiLinkCreateProject');
    const apiLinkDeleteProject = document.getElementById('apiLinkDeleteProject');
    const apiLinkAddRecord = document.getElementById('apiLinkAddRecord');
    const apiLinkUpdateRecord = document.getElementById('apiLinkUpdateRecord');
    const apiLinkDeleteRecord = document.getElementById('apiLinkDeleteRecord');

    const closeProjectApiLinksModalBtn = document.getElementById('closeProjectApiLinksModalBtn');
    const closeRecordApiLinksModalBtn = document.getElementById('closeRecordApiLinksModalBtn');

    function copyToClipboard(elementId) {
      const element = document.getElementById(elementId);
      element.select();
      document.execCommand('copy');
      alert('Link copied to clipboard!');
    }
    window.copyToClipboard = copyToClipboard; // Expose to global scope for buttons

    function openProjectApiLinksModal(projectId) {
      const baseUrl = window.location.origin + window.location.pathname;

      apiLinkCreateProject.value = `${baseUrl}?action=createProject&project=YOUR_PROJECT_NAME`;
      apiLinkDeleteProject.value = `${baseUrl}?action=deleteProject&project=${projectId}`;
      apiLinkAddRecord.value = `${baseUrl}?action=addRecord&project=${projectId}&name=YOUR_RECORD_NAME&value=YOUR_RECORD_VALUE`;
      
      projectApiLinksModal.classList.add('active');
    }

    function openRecordApiLinksModal(projectId, recordId, recordName, recordValue) {
      const baseUrl = window.location.origin + window.location.pathname;

      apiLinkUpdateRecord.value = `${baseUrl}?action=updateRecord&project=${projectId}&recordId=${recordId}&name=${recordName}&value=${recordValue}`;
      apiLinkDeleteRecord.value = `${baseUrl}?action=deleteRecord&project=${projectId}&recordId=${recordId}`;

      recordApiLinksModal.classList.add('active');
    }

    // Event listeners for closing API links modals
    closeProjectApiLinksModalBtn.addEventListener('click', () => {
      projectApiLinksModal.classList.remove('active');
    });

    closeRecordApiLinksModalBtn.addEventListener('click', () => {
      recordApiLinksModal.classList.remove('active');
    });

    // Close modals on backdrop click
    projectApiLinksModal.addEventListener('click', (e) => {
      if (e.target === projectApiLinksModal) {
        projectApiLinksModal.classList.remove('active');
      }
    });

    recordApiLinksModal.addEventListener('click', (e) => {
      if (e.target === recordApiLinksModal) {
        recordApiLinksModal.classList.remove('active');
      }
    });

    // Attach copy button listeners within modals
    document.querySelectorAll('.copy-btn').forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        copyToClipboard(targetId);
      });
    });

    // Expose functions to global scope for HTML onclick attributes (for dynamically added elements)
    window.selectProject = selectProject;
    window.openRenameModal = openRenameModal;
    window.openDeleteProjectModal = openDeleteProjectModal;
    window.openAddRecordModal = openAddRecordModal;
    window.openEditRecordModal = openEditRecordModal;
    window.openDeleteRecordModal = openDeleteRecordModal;
    window.openProjectApiLinksModal = openProjectApiLinksModal;
    window.openRecordApiLinksModal = openRecordApiLinksModal;

    // Firebase Config Modal functions
    function openFirebaseConfigModal() {
      firebaseConfigOutput.value = FIREBASE_CONFIG_OBJECT;
      firebaseConfigModal.classList.add('active');
    }

    function closeFirebaseConfigModal() {
      firebaseConfigModal.classList.remove('active');
    }

    // Event listeners for Firebase Config Modal
    openFirebaseConfigBtn.addEventListener('click', openFirebaseConfigModal);
    closeFirebaseConfigModalBtn.addEventListener('click', closeFirebaseConfigModal);
    firebaseConfigModal.addEventListener('click', (e) => {
      if (e.target === firebaseConfigModal) {
        closeFirebaseConfigModal();
      }
    });

    // Initial app initialization and data load
    // initializeSampleData(); // This will now be called after successful authentication

    // --- URL API Logic (moved here to ensure projects are loaded) ---
    function getUrlParams() {
      const params = {};
      window.location.search.substring(1).split('&').forEach(param => {
        const parts = param.split('=');
        if (parts[0]) {
          params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
        }
      });
      return params;
    }
