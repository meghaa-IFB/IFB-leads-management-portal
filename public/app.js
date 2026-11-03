const state = {
  leads: [],
  customers: [],
  products: [],
  selectedLeadId: null,
  profileLeadMatches: [],
  selectedLeadSection: 'business-development',
  currentProfileSection: 'business-development',
  reportFilter: 'all',
  currentPage: 'findLeads',
  profileReturnPage: 'findLeads',
  isDirty: false,
  editingLeadId: null,
  isLoadingLead: false
};

const API = {
  async get(path) {
    const response = await fetch(`${API_BASE_URL}${path}`);
    if (!response.ok) throw new Error(`Request failed for ${path}`);
    return response.json();
  },
  async post(path, body) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  async put(path, body) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
};

const statusOptions = [
  'New Lead',
  'Contacted',
  'Technical Discussion',
  'Sample Given',
  'RFQ Received',
  'Quotation Submitted',
  'Negotiation',
  'Won',
  'Lost',
  'On Hold'
];

const RECENT_SEARCHES_KEY = 'ifb-lead-portal-recent-searches';
const RECENT_SEARCH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const APP_SETTINGS_KEY = 'ifb-lead-portal-settings';
const API_BASE_URL = window.location.port === '5500' ? 'http://localhost:3000' : '';
const DEFAULT_APP_SETTINGS = { theme: 'light', density: 'comfortable', operationalReadiness: true };
const validThemes = ['light', 'dark'];
const validDensities = ['comfortable', 'compact'];

const PAGE_LABELS = {
  findLeads: 'Find Leads',
  leadProfile: 'Lead Details',
  addLead: 'Lead Details',
  updateLead: 'Update Lead Details',
  addNewLead: 'Add New Lead Details',
  customers: 'Customer Master',
  products: 'Product Master',
  followups: 'Follow-ups and Action Items',
  reports: 'Reports',
  settings: 'Settings'
};

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

function updateClock() {
  const clock = document.getElementById('liveClock');
  if (clock) {
    clock.textContent = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

function setPage(pageKey) {
  const actualPageKey = (pageKey === 'updateLead' || pageKey === 'addNewLead') ? 'addLead' : pageKey;

  state.currentPage = pageKey;
  document.querySelector('.app-shell').classList.toggle('profile-open', pageKey === 'leadProfile');
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active',
      button.dataset.page === pageKey
      || (pageKey === 'leadProfile' && button.dataset.profilePage === state.currentProfileSection)
    );
  });
  document.querySelectorAll('.page').forEach((page) => {
    page.classList.toggle('active', page.id === `${actualPageKey}Page`);
  });
  document.getElementById('pageTitle').textContent = pageKey === 'leadProfile'
    ? PAGE_LABELS.leadProfile
    : PAGE_LABELS[pageKey] || PAGE_LABELS.findLeads;

  const form = document.getElementById('leadForm');
  const selectorPanel = document.getElementById('updateLeadSelectorPanel');
  const excelPanel = document.getElementById('excelImportPanel');
  const saveButton = document.getElementById('saveLeadBtn');
  const updateButton = document.getElementById('updateLeadBtn');
  const heading = document.getElementById('leadFormHeading');
  const subheading = document.getElementById('leadFormSubheading');
  const modeTag = document.getElementById('leadFormModeTag');

  if (pageKey === 'addNewLead') {
    if (heading) heading.textContent = 'Add New Lead Details';
    if (subheading) subheading.textContent = 'Enter customer, product, qualification, and relationship details manually below.';
    if (modeTag) modeTag.textContent = 'New Lead';
    if (selectorPanel) selectorPanel.style.display = 'none';
    if (excelPanel) excelPanel.style.display = 'flex';
    if (saveButton) saveButton.style.display = 'inline-flex';
    if (updateButton) updateButton.style.display = 'none';

    state.editingLeadId = null;
    state.isDirty = false;
    state.isLoadingLead = false;
    if (form) form.reset();
    renderProfileEntryEditors();
    populateLeadEntryDropdowns();
  } else if (pageKey === 'updateLead') {
    if (heading) heading.textContent = 'Update Lead Details';
    if (subheading) subheading.textContent = 'Select customer name from the dropdown to automatically fetch lead details, alter any data, and update.';
    if (modeTag) modeTag.textContent = 'Update mode';
    if (selectorPanel) selectorPanel.style.display = 'block';
    if (excelPanel) excelPanel.style.display = 'none';
    if (saveButton) saveButton.style.display = 'none';
    if (updateButton) updateButton.style.display = 'inline-flex';

    populateUpdateCustomerDropdown();

    if (state.editingLeadId) {
      const currentLead = state.leads.find((l) => l.id === state.editingLeadId);
      if (currentLead) {
        const custSelect = document.getElementById('updateCustomerSelect');
        if (custSelect) custSelect.value = currentLead.customerName;
        populateFormWithLead(currentLead);
      }
    } else {
      if (form) form.reset();
      renderProfileEntryEditors();
      populateLeadEntryDropdowns();
    }
  }

  closeMobileMenu();
}

function closeMobileMenu() {
  document.querySelector('.app-shell').classList.remove('sidebar-open');
  const toggle = document.getElementById('mobileMenuToggle');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation menu');
}

function bindNav() {
  const menuToggle = document.getElementById('mobileMenuToggle');
  menuToggle.addEventListener('click', () => {
    const isOpen = document.querySelector('.app-shell').classList.toggle('sidebar-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  });
  document.getElementById('sidebarBackdrop').addEventListener('click', closeMobileMenu);
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => setPage(button.dataset.page));
  });
  document.querySelectorAll('[data-page]').forEach((button) => {
    if (button.classList.contains('nav-item')) return;
    button.addEventListener('click', () => setPage(button.dataset.page));
  });

  document.getElementById('profileLeadSelect').addEventListener('change', (event) => {
    state.selectedLeadId = event.target.value;
    renderLeadProfilePage();
  });
  document.querySelectorAll('.profile-slide-tab').forEach((button) => {
    button.addEventListener('click', () => applyLeadProfileSection(Number(button.dataset.slideIndex)));
  });
  document.getElementById('backToFindLeadsBtn').addEventListener('click', () => {
    setPage(state.profileReturnPage);
    state.profileReturnPage = 'findLeads';
    document.getElementById('backToFindLeadsBtn').textContent = 'Back';
  });
  // Edit lead from profile removed
}

function getAppSettings() {
  try {
    const stored = localStorage.getItem(APP_SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(stored);
    const theme = validThemes.includes(parsed.theme)
      ? parsed.theme
      : DEFAULT_APP_SETTINGS.theme;
    if (parsed.theme !== theme) {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ ...parsed, theme }));
    }
    return {
      theme,
      density: validDensities.includes(parsed.density) ? parsed.density : DEFAULT_APP_SETTINGS.density,
      operationalReadiness: typeof parsed.operationalReadiness === 'boolean'
        ? parsed.operationalReadiness
        : DEFAULT_APP_SETTINGS.operationalReadiness
    };
  } catch (error) {
    showToast(`Unable to read saved settings: ${error.message}`);
    return { ...DEFAULT_APP_SETTINGS };
  }
}

function applyAppSettings() {
  const settings = getAppSettings();
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.density = settings.density;
  document.getElementById('themePreference').value = settings.theme;
  document.getElementById('densityPreference').value = settings.density;
  document.getElementById('operationalReadinessPreference').value = settings.operationalReadiness ? 'enabled' : 'disabled';
  document.getElementById('operationalReadinessFormSection').hidden = !settings.operationalReadiness;
  document.querySelector('.profile-slide-tab[data-slide-index="3"]').hidden = !settings.operationalReadiness;
  if (state.currentPage === 'leadProfile' && state.profileLeadMatches.length) {
    renderLeadProfilePage();
  }
}

function bindSettings() {
  const themeSelect = document.getElementById('themePreference');
  const densitySelect = document.getElementById('densityPreference');
  const operationalReadinessSelect = document.getElementById('operationalReadinessPreference');
  const saveStatus = document.getElementById('settingsSaveStatus');
  const refreshButton = document.getElementById('refreshPortalDataBtn');
  const persistSettings = () => {
    const settings = {
      ...getAppSettings(),
      theme: themeSelect.value,
      density: densitySelect.value,
      operationalReadiness: operationalReadinessSelect.value === 'enabled'
    };
    try {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
      applyAppSettings();
      saveStatus.textContent = 'Preferences saved on this device.';
    } catch (error) {
      showToast(`Unable to save settings: ${error.message}`);
    }
  };

  themeSelect.addEventListener('change', persistSettings);
  densitySelect.addEventListener('change', persistSettings);
  operationalReadinessSelect.addEventListener('change', persistSettings);
  refreshButton.addEventListener('click', async () => {
    refreshButton.disabled = true;
    const loaded = await loadData();
    refreshButton.disabled = false;
    if (loaded) showToast('Portal data refreshed');
  });
  document.getElementById('clearSettingsSearchHistoryBtn').addEventListener('click', () => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      renderRecentLeadSearches();
      showToast('Recent search history cleared');
    } catch (error) {
      showToast(`Unable to clear recent search history: ${error.message}`);
    }
  });
}

function renderSettingsDataSummary() {
  document.getElementById('settingsLeadCount').textContent = state.leads.length;
  document.getElementById('settingsCustomerCount').textContent = state.customers.length;
  document.getElementById('settingsProductCount').textContent = state.products.length;
}

function applyLeadProfileSection(slideIndex) {
  const slides = document.querySelectorAll('#profilePageContent > [data-profile-section]');
  if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= slides.length) return;

  state.selectedLeadSection = slideIndex;
  slides.forEach((section, index) => {
    section.classList.toggle('active', index === slideIndex);
    section.hidden = index !== slideIndex;
  });
  document.querySelectorAll('.profile-slide-tab').forEach((button) => {
    const isSelected = Number(button.dataset.slideIndex) === slideIndex;
    button.classList.toggle('active', isSelected);
    button.setAttribute('aria-selected', String(isSelected));
  });
}

function renderLeadProfilePage() {
  const matchedLeads = state.profileLeadMatches
    .map((leadId) => state.leads.find((lead) => lead.id === leadId))
    .filter(Boolean);
  const selector = document.getElementById('profileLeadSelect');
  const picker = document.getElementById('profileLeadPicker');
  const content = document.getElementById('profilePageContent');
  const sections = ['company-profile', 'customer-history', 'technical-commercial'];
  if (getAppSettings().operationalReadiness) sections.push('operational-readiness');

  if (!matchedLeads.length) {
    selector.innerHTML = '<option value="">No matching leads</option>';
    picker.hidden = true;
    
    content.innerHTML = '<div class="empty-state">No matching lead was selected.</div>';
    return;
  }
  

  if (!matchedLeads.some((lead) => lead.id === state.selectedLeadId)) {
    state.selectedLeadId = matchedLeads[0].id;
  }

  selector.innerHTML = matchedLeads.map((lead) =>
    `<option value="${escapeHTML(lead.id)}">${escapeHTML(lead.customerName)} — ${escapeHTML(lead.productName || 'No product')} (${escapeHTML(getLeadActivityStatus(lead))})</option>`
  ).join('');
  selector.value = state.selectedLeadId;
  picker.hidden = matchedLeads.length < 2;

  selectLeadById(state.selectedLeadId);
  const source = document.getElementById('leadDetailView');
  const panes = sections.map((section) => source.querySelector(`[data-profile-section="${section}"]`));
  if (panes.some((pane) => !pane)) {
    content.innerHTML = '<div class="empty-state">The complete lead profile is unavailable.</div>';
    return;
  }
  content.replaceChildren(...panes.map((pane) => {
    const clone = pane.cloneNode(true);
    clone.classList.remove('active');
    return clone;
  }));
  if (state.selectedLeadSection >= sections.length) state.selectedLeadSection = 0;
  applyLeadProfileSection(
    Number.isInteger(state.selectedLeadSection) ? state.selectedLeadSection : 0
  );
}

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const panelId = button.dataset.panel;
      document.querySelectorAll('.tab-btn').forEach((item) => item.classList.toggle('active', item === button));
      document.querySelectorAll('.form-panel').forEach((panel) => panel.classList.toggle('active', panel.id === panelId));
    });
  });
}

function availableCustomers() {
  const customers = [...state.customers];
  state.leads.forEach((lead) => {
    if (!customers.some((customer) => customer.customerName === lead.customerName)) {
      customers.push({
        customerName: lead.customerName,
        customerCode: lead.customerCode || ''
      });
    }
  });
  return customers.filter((customer) => customer.customerName).sort((a, b) => a.customerName.localeCompare(b.customerName));
}

function availableProducts() {
  const products = [...state.products];
  state.leads.forEach((lead) => {
    if (!products.some((product) => product.partNumber === lead.partNumber && product.productName === lead.productName)) {
      products.push({
        productName: lead.productName || '',
        application: lead.application || '',
        partNumber: lead.partNumber || '',
        description: lead.productDescription || ''
      });
    }
  });
  return products.filter((product) => product.productName || product.application || product.partNumber);
}

function replaceSelectOptions(select, options, placeholder) {
  const selectedValue = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` + options.map((option) => {
    const value = typeof option === 'string' ? option : option.value;
    const label = typeof option === 'string' ? option : option.label;
    return `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`;
  }).join('');
  if (options.some((option) => (typeof option === 'string' ? option : option.value) === selectedValue)) {
    select.value = selectedValue;
  }
}

function populateLeadEntryDropdowns() {
  const custDataList = document.getElementById('customerNameSuggestions');
  const prodDataList = document.getElementById('productNameSuggestions');
  const appDataList = document.getElementById('applicationSuggestions');
  const partDataList = document.getElementById('partNumberSuggestions');

  if (custDataList) {
    const customers = availableCustomers();
    custDataList.innerHTML = customers.map((c) => `<option value="${escapeHTML(c.customerName)}"></option>`).join('');
  }
  if (prodDataList) {
    const products = availableProducts();
    prodDataList.innerHTML = [...new Set(products.map((p) => p.productName).filter(Boolean))]
      .map((name) => `<option value="${escapeHTML(name)}"></option>`).join('');
  }
  if (appDataList) {
    const products = availableProducts();
    appDataList.innerHTML = [...new Set(products.map((p) => p.application).filter(Boolean))]
      .map((name) => `<option value="${escapeHTML(name)}"></option>`).join('');
  }
  if (partDataList) {
    const products = availableProducts();
    partDataList.innerHTML = [...new Set(products.map((p) => p.partNumber).filter(Boolean))]
      .map((name) => `<option value="${escapeHTML(name)}"></option>`).join('');
  }

  // When customer name matches an existing customer in manual entry, auto-fill code if empty
  const customerInput = document.getElementById('leadCustomerNameInput');
  const codeInput = document.getElementById('leadCustomerCodeInput');
  if (customerInput && codeInput) {
    customerInput.oninput = () => {
      if (!codeInput.value) {
        const match = availableCustomers().find((c) => c.customerName.toLowerCase() === customerInput.value.trim().toLowerCase());
        if (match && match.customerCode) {
          codeInput.value = match.customerCode;
        }
      }
    };
  }

  // When part number matches an existing product in manual entry, auto-fill related details if empty
  const partInput = document.getElementById('leadPartNumberInput');
  const appInput = document.getElementById('leadApplicationInput');
  const prodInput = document.getElementById('leadProductNameInput');
  const descInput = document.getElementById('leadProductDescriptionInput');
  if (partInput) {
    partInput.oninput = () => {
      const match = availableProducts().find((p) => p.partNumber && p.partNumber.toLowerCase() === partInput.value.trim().toLowerCase());
      if (match) {
        if (appInput && !appInput.value && match.application) appInput.value = match.application;
        if (prodInput && !prodInput.value && match.productName) prodInput.value = match.productName;
        if (descInput && !descInput.value && match.description) descInput.value = match.description;
      }
    };
  }
}

function bindLeadEntryDropdowns(form) {
  populateLeadEntryDropdowns();
}

function addProfileEntryField(row, labelText, fieldName, value, type = 'text') {
  const label = document.createElement('label');
  label.textContent = labelText;
  const field = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  if (type !== 'textarea') field.type = type;
  field.dataset.entryField = fieldName;
  field.value = value ?? '';
  label.append(field);
  row.append(label);
}

function createProfileEntryRow(kind, entry = {}) {
  const row = document.createElement('div');
  row.className = 'profile-entry-row';
  if (kind === 'action') {
    addProfileEntryField(row, 'Action item', 'actionItem', entry.actionItem);
    addProfileEntryField(row, 'Person responsible', 'personResponsible', entry.personResponsible);
    addProfileEntryField(row, 'Target date', 'targetDate', entry.targetDate, 'date');
    addProfileEntryField(row, 'Revised date', 'revisedDate', entry.revisedDate, 'date');
    addProfileEntryField(row, 'Remarks', 'remarks', entry.remarks, 'textarea');
  } else {
    addProfileEntryField(row, 'Date', 'date', entry.date, 'date');
    addProfileEntryField(row, 'Event', 'title', entry.title);
    addProfileEntryField(row, 'Details', 'details', entry.details, 'textarea');
  }

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'ghost compact-button profile-entry-remove';
  removeButton.dataset.removeEntry = kind;
  removeButton.textContent = 'Remove';
  row.append(removeButton);
  return row;
}

function renderProfileEntryEditors(actionItems = [], timeline = []) {
  const actionList = document.getElementById('actionItemsEditor');
  const timelineList = document.getElementById('timelineEditor');
  actionList.replaceChildren(...actionItems.map((item) => createProfileEntryRow('action', item)));
  timelineList.replaceChildren(...timeline.map((item) => createProfileEntryRow('timeline', item)));
  document.querySelector('[data-empty-note="action"]').hidden = actionItems.length > 0;
  document.querySelector('[data-empty-note="timeline"]').hidden = timeline.length > 0;
}

function readProfileEntryRows(containerId) {
  return [...document.querySelectorAll(`#${containerId} .profile-entry-row`)]
    .map((row) => Object.fromEntries([...row.querySelectorAll('[data-entry-field]')]
      .map((field) => [field.dataset.entryField, field.value.trim()])))
    .filter((entry) => Object.values(entry).some(Boolean));
}

function populateMasterFilters() {
  populateLeadEntryDropdowns();
}

function handleLeadFormDirty() {
  state.isDirty = true;
}

function normalizeExcelHeader(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function excelField(row, ...names) {
  const fields = new Map(Object.entries(row).map(([name, value]) => [normalizeExcelHeader(name), value]));
  for (const name of names) {
    const key = normalizeExcelHeader(name);
    if (fields.has(key)) return fields.get(key);
  }
  return '';
}

function extractExcelLeadRows(workbook) {
  for (const sheetName of workbook.SheetNames) {
    const matrix = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: true
    });
    const headerRowIndex = matrix.findIndex((row) => {
      const headers = new Set(row.map(normalizeExcelHeader));
      return headers.has('customername')
        && headers.has('application')
        && (headers.has('partno') || headers.has('partnumber'));
    });
    if (headerRowIndex < 0) continue;

    const headers = matrix[headerRowIndex].map((header) => String(header ?? '').trim());
    const rows = matrix.slice(headerRowIndex + 1).map((values, index) => ({
      rowNumber: headerRowIndex + index + 2,
      values: Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex] ?? '']))
    })).filter(({ values }) => Object.values(values).some((value) => value !== '' && value !== null));
    return { sheetName, rows };
  }
  throw new Error('No lead table found. Use one lead per row with Customer Name, Application, and Part No. columns. The Book2 reference sheet is a field guide, not a lead list.');
}

function mapExcelLeadRows(rows) {
  const leads = [];
  const errors = [];

  rows.forEach(({ rowNumber, values }) => {
    const customerName = String(excelField(values, 'Customer Name') ?? '').trim();
    const application = String(excelField(values, 'Application') ?? '').trim();
    const partNumber = String(excelField(values, 'Part No.', 'Part Number') ?? '').trim();
    const product = availableProducts().find((item) =>
      item.application?.toLowerCase() === application.toLowerCase()
      && item.partNumber?.toLowerCase() === partNumber.toLowerCase()
    );
    const productName = String(excelField(values, 'Product Name') || product?.productName || '').trim();
    const missing = [];
    if (!customerName) missing.push('Customer Name');
    if (!application) missing.push('Application');
    if (!partNumber) missing.push('Part No.');
    if (!productName) missing.push('a Product Name or a matching product in Product Master');
    if (missing.length) {
      errors.push(`Row ${rowNumber}: missing ${missing.join(', ')}.`);
      return;
    }

    const currentDate = new Date();
    const productDescription = String(excelField(values, 'Product Description') || product?.description || '').trim();
    const customer = availableCustomers().find((item) =>
      item.customerName?.toLowerCase() === customerName.toLowerCase()
    );
    leads.push({
      rowNumber,
      lead: {
        customerName,
        customerCode: String(excelField(values, 'Customer Code') || customer?.customerCode || '').trim(),
        application,
        partNumber,
        productName,
        productDescription,
        status: 'New Lead',
        createdAt: currentDate.toISOString().slice(0, 10)
      }
    });
  });

  return { leads, errors };
}

function setExcelUploadMessage(message, isError = false) {
  const status = document.getElementById('excelUploadMessage');
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function loadExcelLibrary() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${API_BASE_URL}/vendor/xlsx.full.min.js`;
    script.onload = resolve;
    script.onerror = () => reject(new Error('The Excel reader could not be loaded. Refresh the page and try again.'));
    document.head.appendChild(script);
  });
}

function bindExcelLeadUpload() {
  const button = document.getElementById('uploadLeadExcelBtn');
  const downloadButton = document.getElementById('downloadLeadExcelTemplateBtn');
  const fileInput = document.getElementById('leadExcelFile');
  button.addEventListener('click', () => fileInput.click());
  downloadButton.addEventListener('click', async () => {
    downloadButton.disabled = true;
    try {
      await loadExcelLibrary();
      const workbook = window.XLSX.utils.book_new();
      const instructions = [
        ['IFB Lead Upload Template'],
        ['Enter one lead per row in the Leads sheet. Do not rename the required columns.'],
        ['Required: Customer Name, Application, Part No. and Product Name (Product Name may be omitted when Application + Part No. match Product Master).'],
        ['Customer Code and Product Description are optional; matching master data fills them when available.']
      ];
      const instructionSheet = window.XLSX.utils.aoa_to_sheet(instructions);
      instructionSheet['!cols'] = [{ wch: 115 }];
      window.XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');

      const headers = [
        'Customer Name',
        'Customer Code',
        'Application',
        'Part No.',
        'Product Name',
        'Product Description'
      ];
      const leadSheet = window.XLSX.utils.aoa_to_sheet([headers]);
      leadSheet['!cols'] = headers.map((header) => ({ wch: Math.max(18, header.length + 2) }));
      window.XLSX.utils.book_append_sheet(workbook, leadSheet, 'Leads');
      window.XLSX.writeFile(workbook, 'IFB_Lead_Upload_Template.xlsx');
      setExcelUploadMessage('Excel template downloaded. Fill the Leads sheet and upload it here.');
    } catch (error) {
      setExcelUploadMessage(error.message || 'Unable to download the Excel template.', true);
      showToast(error.message || 'Unable to download the Excel template.');
    } finally {
      downloadButton.disabled = false;
    }
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    button.disabled = true;
    setExcelUploadMessage(`Reading ${file.name}…`);
    try {
      await loadExcelLibrary();
      if (file.size > 10 * 1024 * 1024) throw new Error('Excel files must be 10 MB or smaller.');
      const workbook = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const { sheetName, rows } = extractExcelLeadRows(workbook);
      if (!rows.length) throw new Error(`No lead rows were found in "${sheetName}".`);
      if (rows.length > 500) throw new Error('Import a maximum of 500 leads at a time.');

      const { leads, errors } = mapExcelLeadRows(rows);
      if (errors.length) {
        const details = errors.slice(0, 6).join(' ');
        const more = errors.length > 6 ? ` ${errors.length - 6} more row(s) need correction.` : '';
        throw new Error(`No leads were imported. ${details}${more}`);
      }
      const examples = leads.slice(0, 3).map(({ lead }) => lead.customerName).join(', ');
      if (!window.confirm(`Import ${leads.length} lead(s) from "${file.name}"? Existing leads will not be changed.${examples ? `\n\nExamples: ${examples}` : ''}`)) {
        setExcelUploadMessage('Import canceled. No leads were added.');
        return;
      }

      const result = await API.post('/api/leads/import', { leads });
      await loadData();
      setExcelUploadMessage(`Imported ${result.imported} lead(s) from ${file.name}.`);
      showToast(`${result.imported} lead(s) imported successfully`);
    } catch (error) {
      setExcelUploadMessage(error.message || 'Unable to import this Excel file.', true);
      showToast(error.message || 'Unable to import this Excel file.');
    } finally {
      fileInput.value = '';
      button.disabled = false;
    }
  });
}

function bindLeadForm() {
  const form = document.getElementById('leadForm');
  const resetButton = document.getElementById('resetLeadBtn');
  const cancelButton = document.getElementById('cancelLeadBtn');
  const updateButton = document.getElementById('updateLeadBtn');
  const saveButton = document.getElementById('saveLeadBtn');

  form.addEventListener('input', handleLeadFormDirty);
  form.addEventListener('change', handleLeadFormDirty);
  form.addEventListener('reset', () => {
    const preserveProfileData = state.isLoadingLead;
    window.setTimeout(() => {
      populateLeadEntryDropdowns();
      if (!preserveProfileData) renderProfileEntryEditors();
    });
  });
  form.querySelectorAll('[data-add-entry]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.addEntry;
      const container = document.getElementById(kind === 'action' ? 'actionItemsEditor' : 'timelineEditor');
      container.append(createProfileEntryRow(kind));
      document.querySelector(`[data-empty-note="${kind}"]`).hidden = true;
      state.isDirty = true;
    });
  });
  form.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-entry]');
    if (!button) return;
    const kind = button.dataset.removeEntry;
    button.closest('.profile-entry-row').remove();
    const containerId = kind === 'action' ? 'actionItemsEditor' : 'timelineEditor';
    const hasEntries = document.getElementById(containerId).children.length > 0;
    document.querySelector(`[data-empty-note="${kind}"]`).hidden = hasEntries;
    handleLeadFormDirty();
  });
  resetButton.addEventListener('click', () => {
    if (state.isDirty && !window.confirm('Discard unsaved lead changes?')) return;
    form.reset();
    state.isDirty = false;
    state.editingLeadId = null;
    document.getElementById('leadFormModeTag').textContent = 'Create mode';
    updateButton.style.display = 'none';
    saveButton.style.display = 'inline-flex';
  });

  cancelButton.addEventListener('click', () => {
    if (state.isDirty && !window.confirm('Discard unsaved lead changes?')) return;
    setPage('findLeads');
    form.reset();
    state.editingLeadId = null;
    state.isDirty = false;
    document.getElementById('leadFormModeTag').textContent = 'Create mode';
    updateButton.style.display = 'none';
    saveButton.style.display = 'inline-flex';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    ['technicalDiscussion', 'sampleGiven', 'rfqReceived', 'quoted'].forEach((name) => {
      payload[name] = payload[name] === 'true';
    });
    payload.actionItems = readProfileEntryRows('actionItemsEditor');
    payload.timeline = readProfileEntryRows('timelineEditor');
    if (state.editingLeadId) {
      const existingLead = state.leads.find((lead) => lead.id === state.editingLeadId);
      payload.statusHistory = existingLead?.statusHistory || [];
      if (existingLead && existingLead.status !== payload.status) {
        payload.statusHistory = [...payload.statusHistory, {
          date: new Date().toISOString().slice(0, 10),
          status: payload.status,
          notes: `Status updated to ${payload.status}.`
        }];
      }
    }

    try {
      if (state.editingLeadId) {
        await API.put(`/api/leads/${state.editingLeadId}`, payload);
        showToast('Lead updated successfully');
      } else {
        await API.post('/api/leads', payload);
        showToast('Lead saved successfully');
      }
      await loadData();
      form.reset();
      state.editingLeadId = null;
      state.isDirty = false;
      document.getElementById('leadFormModeTag').textContent = 'Create mode';
      updateButton.style.display = 'none';
      setPage('findLeads');
    } catch (error) {
      showToast(error.message || 'Unable to save lead');
    }
  });

  updateButton.addEventListener('click', async () => {
    if (!state.editingLeadId) {
      showToast('Please select a customer from the dropdown above first.');
      return;
    }

    form.requestSubmit();
  });

  updateButton.style.display = 'none';
  saveButton.style.display = 'inline-flex';
}

function bindCustomerMaster() {
  document.getElementById('customerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      await API.post('/api/customers', payload);
      event.target.reset();
      await loadData();
      showToast('Customer saved');
    } catch (error) {
      showToast(error.message || 'Unable to save customer');
    }
  });

  document.getElementById('resetCustomerFormBtn').addEventListener('click', () => {
    document.getElementById('customerForm').reset();
  });
}

function bindProductMaster() {
  document.getElementById('productForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    try {
      await API.post('/api/products', payload);
      event.target.reset();
      await loadData();
      showToast('Product saved');
    } catch (error) {
      showToast(error.message || 'Unable to save product');
    }
  });

  document.getElementById('resetProductFormBtn').addEventListener('click', () => {
    document.getElementById('productForm').reset();
  });
}

function bindSearchPage() {
  const form = document.getElementById('leadLookupForm');
  const message = document.getElementById('leadLookupMessage');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const customerInput = document.getElementById('searchCustomerName').value.trim();
    const productInput = document.getElementById('searchProductName').value.trim();
    const customerName = customerInput.toLowerCase();
    const productName = productInput.toLowerCase();
    const matches = state.leads
      .filter((lead) =>
        (lead.customerName || '').toLowerCase().includes(customerName)
        && `${lead.productName || ''} ${lead.application || ''}`.toLowerCase().includes(productName)
      )
      .sort((first, second) =>
        new Date(second.lastUpdated || second.createdAt || 0) - new Date(first.lastUpdated || first.createdAt || 0)
      );

    if (!matches.length) {
      message.textContent = 'No lead matches both names. Check the customer and product names and try again.';
      return;
    }

    message.textContent = '';
    saveRecentLeadSearch(customerName, productName);
    openLeadProfile(matches.map((lead) => lead.id));
  });
  form.addEventListener('reset', () => {
    message.textContent = '';
    message.textContent = '';
  });

  document.getElementById('clearRecentSearchesBtn').addEventListener('click', () => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      renderRecentLeadSearches();
    } catch (error) {
      showToast(`Unable to clear recent searches: ${error.message}`);
    }
  });

  renderRecentLeadSearches();
}

function readRecentLeadSearches() {
  const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
  if (!stored) return [];
  const searches = JSON.parse(stored);
  if (!Array.isArray(searches)) throw new Error('Recent search history has an invalid format.');

  const cutoff = Date.now() - RECENT_SEARCH_RETENTION_MS;
  const recentSearches = searches.filter((search) =>
    search
    && typeof search.customerName === 'string'
    && typeof search.productName === 'string'
    && typeof search.searchedAt === 'string'
    && Number.isFinite(Date.parse(search.searchedAt))
    && Date.parse(search.searchedAt) >= cutoff
  );
  if (recentSearches.length !== searches.length) {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  }
  return recentSearches;
}

function renderRecentLeadSearches() {
  const container = document.getElementById('recentLeadSearches');
  let searches;
  try {
    searches = readRecentLeadSearches();
  } catch (error) {
    container.innerHTML = `<div class="empty-state">${escapeHTML(error.message || 'Unable to load recent searches.')}</div>`;
    showToast(error.message || 'Unable to load recent searches.');
    return;
  }

  container.innerHTML = searches.length
    ? searches.map((search, index) => `
      <button type="button" class="recent-search-item" data-recent-search="${index}">
        <span class="recent-search-names">
          <strong>${escapeHTML(search.customerName)}</strong>
          <span>${escapeHTML(search.productName)}</span>
        </span>
        <time datetime="${escapeHTML(search.searchedAt)}">${escapeHTML(new Date(search.searchedAt).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }))}</time>
      </button>
    `).join('')
    : '<div class="empty-state">No searches in the last 30 days.</div>';

  container.querySelectorAll('[data-recent-search]').forEach((button) => {
    button.addEventListener('click', () => {
      const search = searches[Number(button.dataset.recentSearch)];
      if (!search) return;
      document.getElementById('searchCustomerName').value = search.customerName;
      document.getElementById('searchProductName').value = search.productName;
      document.getElementById('leadLookupForm').requestSubmit();
    });
  });
}

function saveRecentLeadSearch(customerName, productName) {
  try {
    const searches = readRecentLeadSearches();
    const normalizedCustomer = customerName.toLowerCase();
    const normalizedProduct = productName.toLowerCase();
    const updatedSearches = [{
      customerName,
      productName,
      searchedAt: new Date().toISOString()
    }, ...searches.filter((search) =>
      search.customerName.toLowerCase() !== normalizedCustomer
      || search.productName.toLowerCase() !== normalizedProduct
    )];
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
    renderRecentLeadSearches();
  } catch (error) {
    showToast(`Unable to save recent search: ${error.message}`);
  }
}

async function loadData() {
  try {
    const [customers, products, leads] = await Promise.all([
      API.get('/api/customers'),
      API.get('/api/products'),
      API.get('/api/leads')
    ]);

    state.customers = customers;
    state.products = products;
    state.leads = leads;
    populateMasterFilters();
    populateUpdateCustomerDropdown();
    renderReports();
    renderFollowUps();
    renderSettingsDataSummary();
    return true;
  } catch (error) {
    showToast(`Unable to load saved data: ${error.message}`);
    return false;
  }
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function openLeadProfile(leadIds) {
  state.profileReturnPage = state.currentPage;
  document.getElementById('backToFindLeadsBtn').textContent = state.profileReturnPage === 'reports'
    ? 'Back to Reports'
    : 'Back';
  state.profileLeadMatches = leadIds;
  state.selectedLeadId = leadIds[0] || null;
  state.selectedLeadSection = 0;
  renderLeadProfilePage();
  setPage('leadProfile');
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function getLeadActivityStatus(lead) {
  const normalized = String(lead?.status || '').trim().toLowerCase();
  if (['won', 'lost', 'closed', 'inactive', 'not active', 'disqualified', 'cancelled', 'rejected'].includes(normalized)) {
    return 'Inactive';
  }
  return 'Active';
}

function isLeadActive(lead) {
  return getLeadActivityStatus(lead) === 'Active';
}

function leadActivityBadge(lead) {
  const active = isLeadActive(lead);
  return `
    <span class="lead-activity-badge ${active ? 'active' : 'inactive'}">
      <span class="lead-activity-dot" aria-hidden="true"></span>
      ${active ? 'Active' : 'Inactive'}
    </span>
  `;
}

function selectLeadById(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) return;

  state.selectedLeadId = leadId;
  const detail = document.getElementById('leadDetailView');
  const field = (label, value) => `<div><strong>${label}:</strong><br>${escapeHTML(value === '' || value === null || value === undefined || value === 0 ? '—' : value)}</div>`;
  const profileField = (label, value) => `<div><strong>${label}:</strong><br>${escapeHTML(value === '' || value === null || value === undefined ? 'Not provided' : value)}</div>`;
  const timeline = (lead.timeline || []).map((entry) => `
    <div class="list-item">
      <strong>${escapeHTML(entry.title || '—')}</strong>
      <div class="muted">${formatDate(entry.date)}</div>
      <div>${escapeHTML(entry.details || '—')}</div>
    </div>
  `).join('') || '<div class="empty-state">No relationship timeline entries recorded.</div>';
  const actionItems = (lead.actionItems || []).map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHTML(item.actionItem || '—')}</td>
      <td>${escapeHTML(item.personResponsible || '—')}</td>
      <td>${escapeHTML(formatDate(item.targetDate))}</td>
      <td>${escapeHTML(formatDate(item.revisedDate))}</td>
      <td>${escapeHTML(item.remarks || '—')}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty-state">No action items recorded.</td></tr>';
  const readiness = lead.operationalReadiness || {};
  const leadTimes = readiness.leadTime || {};
  const productionChallenges = readiness.challengesForMassProduction || {};
  const childPartsLeadTime = readiness.childPartsLeadTime || {};
  const readinessCell = (value) => `<td>${escapeHTML(value === '' || value === null || value === undefined ? 'Not provided' : value)}</td>`;

  detail.innerHTML = `
    <div class="detail-header">
      <div>
        <h3>${escapeHTML(lead.customerName)}</h3>
        <div class="muted">Customer code: ${escapeHTML(lead.customerCode || '—')}</div>
      </div>
      <div class="detail-header-statuses">
        <span class="tag ${isLeadActive(lead) ? 'tag-active' : 'tag-inactive'}">${escapeHTML(getLeadActivityStatus(lead))}</span>
        <span class="tag">${escapeHTML(lead.status || 'New Lead')}</span>
      </div>
    </div>

    <div class="find-lead-overview">
      <div><strong>Product / application</strong><span>${escapeHTML([lead.productName, lead.application].filter(Boolean).join(' • ') || '—')}</span></div>
      <div><strong>Responsible person</strong><span>${escapeHTML(lead.responsiblePerson || '—')}</span></div>
      <div><strong>Next follow-up</strong><span>${escapeHTML(formatDate(lead.followUpDate))}</span></div>
    </div>

    <div class="profile-section-tabs" role="tablist" aria-label="Lead profile sections">
      <button type="button" class="profile-tab" role="tab" aria-selected="false" data-profile-tab="business-development">Business Development</button>
      <button type="button" class="profile-tab" role="tab" aria-selected="false" data-profile-tab="company-profile">Company Profile &amp; Relationship</button>
      <button type="button" class="profile-tab" role="tab" aria-selected="false" data-profile-tab="customer-history">Customer History</button>
      <button type="button" class="profile-tab" role="tab" aria-selected="false" data-profile-tab="technical-commercial">Technical, Sample &amp; Commercial Status</button>
      <button type="button" class="profile-tab" role="tab" aria-selected="false" data-profile-tab="operational-readiness">Operational Readiness</button>
    </div>

    <section class="profile-pane ppt-profile-pane" role="tabpanel" data-profile-section="business-development">
      <div class="ppt-slide-heading">
        <div><p>Business Development</p><h3>${escapeHTML(lead.customerName)}</h3></div>
        <span>${escapeHTML(lead.productName || 'Air Cooler BLDC Motor Solutions')}</span>
      </div>
      <p class="ppt-cover-subtitle">Leads Profiles</p>
      <div class="detail-grid">
        ${field('Customer', lead.customerName)}
        ${field('Product / solution', lead.productName)}
        ${field('Application', lead.application)}
        ${field('Part number', lead.partNumber)}
        ${field('Lead source', lead.leadSource)}
        ${field('Responsible person', lead.responsiblePerson)}
        ${field('Lead status', lead.status)}
        ${field('Created on', formatDate(lead.createdAt))}
      </div>
      ${lead.productDescription ? `<p>${escapeHTML(lead.productDescription)}</p>` : ''}
    </section>

    <section class="profile-pane ppt-profile-pane" role="tabpanel" data-profile-section="company-profile">
      <div class="ppt-slide-heading">
        <div><h3>${escapeHTML(lead.customerName)}</h3></div>
        <span>${escapeHTML(lead.productName || '—')}</span>
      </div>
      <section class="ppt-section">
        <h4>Lead and Product Details</h4>
        <div class="ppt-section-content">
          ${field('Customer code', lead.customerCode)}
          ${field('Application', lead.application)}
          ${field('Part number', lead.partNumber)}
          ${field('Product description', lead.productDescription)}
          ${field('Responsible person', lead.responsiblePerson)}
          ${field('Lead source', lead.leadSource)}
        </div>
      </section>
      <div class="ppt-company-grid">
        <section class="ppt-section">
          <h4>Contacts &amp; Leadership</h4>
          <div class="ppt-section-content">
            ${field('Contact name', lead.contactPersonName)}
            ${field('Designation', lead.contactPersonDesignation)}
            ${field('Contact number', lead.contactNumber)}
            ${field('Email', lead.email)}
            ${field('Promoters / leadership', lead.promoters)}
          </div>
        </section>
        <section class="ppt-section">
          <h4>Company Footprint</h4>
          <div class="ppt-section-content">
            ${field('Office', lead.officeLocation)}
            ${field('Manufacturing unit', lead.manufacturingUnitLocation)}
          </div>
        </section>
        <section class="ppt-section">
          <h4>Product Scope</h4>
          <div class="ppt-section-content">
            ${field('Current product scope', lead.currentProductScope)}
            ${field('Other product scope', lead.otherProductScope)}
          </div>
        </section>
        <section class="ppt-section">
          <h4>Motor Technology</h4>
          <div class="ppt-section-content">
            ${field('Induction models', lead.inductionModels)}
            ${field('BLDC models', lead.BLDCModels)}
            ${field('Technology', lead.motorTechnology)}
          </div>
        </section>
        <section class="ppt-section ppt-company-wide">
          <h4>Volume Potential</h4>
          <div class="ppt-section-content">
            ${field('Annual volume', lead.annualVolumePotential)}
            ${field('Expected initial volume', lead.expectedInitialVolume)}
          </div>
        </section>
        <section class="ppt-section ppt-company-wide">
          <h4>Relationship Background</h4>
          <div class="ppt-section-content">${field('Relationship background', lead.relationshipBackground)}</div>
        </section>
        <section class="ppt-section ppt-company-wide">
          <h4>Market Intelligence</h4>
          <div class="ppt-section-content">${field('Market intelligence', lead.marketIntelligence)}</div>
        </section>
        <div class="ppt-updated">Updated on: ${escapeHTML(formatDate(lead.lastUpdated || lead.createdAt))}</div>
      </div>
    </section>

    <section class="profile-pane ppt-profile-pane" role="tabpanel" data-profile-section="customer-history">
      <div class="ppt-slide-heading">
        <div><h3>${escapeHTML(lead.customerName)}</h3></div>
        <span>${escapeHTML(lead.productName || '—')}</span>
      </div>
      <section class="ppt-section">
        <h4>Relationship Timeline</h4>
        <div class="ppt-timeline">${timeline}</div>
      </section>
      <div class="ppt-updated">Updated on: ${escapeHTML(formatDate(lead.lastUpdated || lead.createdAt))}</div>
    </section>

    <section class="profile-pane ppt-profile-pane" role="tabpanel" data-profile-section="technical-commercial">
      <div class="ppt-slide-heading">
        <div><h3>${escapeHTML(lead.customerName)}</h3></div>
        <span>${escapeHTML(lead.productName || '—')}</span>
      </div>
      <div class="ppt-status-grid">
        ${[['Technical Discussion', lead.technicalDiscussion], ['Sample Given', lead.sampleGiven], ['RFQ Received', lead.rfqReceived], ['Quoted', lead.quoted]].map(([label, value]) => `
          <div class="ppt-status-item"><span>${label}</span><strong>${value ? 'Yes' : 'No'}</strong></div>
        `).join('')}
      </div>
      <div class="ppt-tech-commercial-grid">
        <section class="ppt-section">
          <h4>Technical Details</h4>
          <div class="ppt-section-content">
            ${profileField('Wattage(s)', lead.wattage)}
            ${profileField('Stack size', lead.stackSize)}
            ${profileField('Form factor', lead.formFactor)}
            ${profileField('Validation status', lead.validationStatus)}
            ${profileField('Technical remarks', lead.technicalRemarks)}
          </div>
        </section>
        <section class="ppt-section">
          <h4>Sample Details</h4>
          <div class="ppt-section-content">
            ${profileField('Number of samples given', lead.sampleQuantity)}
            ${profileField('Sample date', lead.sampleDate ? formatDate(lead.sampleDate) : '')}
          </div>
        </section>
        <section class="ppt-section">
          <h4>Quotation Details</h4>
          <div class="ppt-section-content">
            ${profileField('Quoted price', lead.quotedPrice ? `₹${lead.quotedPrice}` : '')}
            ${profileField('Date sent', lead.quotationDate ? formatDate(lead.quotationDate) : '')}
            ${profileField('Revision', lead.quotationRevision)}
            ${profileField('Commercial remarks', lead.commercialRemarks)}
          </div>
        </section>
        <section class="ppt-section">
          <h4>Status</h4>
          <div class="ppt-section-content">
            ${profileField('Lead status', lead.status)}
            ${profileField('Follow-up date', lead.followUpDate ? formatDate(lead.followUpDate) : '')}
            ${profileField('Next action', lead.nextAction)}
            ${profileField('RFQ date', lead.rfqDate ? formatDate(lead.rfqDate) : '')}
          </div>
        </section>
      </div>
      <section class="ppt-section">
        <h4>Next Steps / Action Items</h4>
        <div class="table-scroll">
          <table class="readiness-table action-items-table">
            <thead><tr><th>S. No.</th><th>Action Items</th><th>Person Responsible</th><th>Target Date</th><th>Revised Date</th><th>Remarks</th></tr></thead>
            <tbody>${actionItems}</tbody>
          </table>
        </div>
      </section>
      <div class="ppt-updated">Updated on: ${escapeHTML(formatDate(lead.lastUpdated || lead.createdAt))}</div>
    </section>

    <section class="profile-pane ppt-profile-pane" role="tabpanel" data-profile-section="operational-readiness">
      <div class="ppt-slide-heading">
        <div><h3>${escapeHTML(lead.customerName)}</h3></div>
        <span>${escapeHTML(lead.productName || '—')}</span>
      </div>
      <section class="ppt-section">
        <h4>Operational Readiness</h4>
        <div class="table-scroll">
          <table class="readiness-table">
            <thead><tr><th>Parameter</th><th>Motor</th><th>Control PCBA</th><th>Touch PCBA</th><th>Tooling</th></tr></thead>
            <tbody>
              <tr><th scope="row">Lead Time</th>${readinessCell(leadTimes.motor)}${readinessCell(leadTimes.controlPCBA)}${readinessCell(leadTimes.touchPCBA)}${readinessCell(leadTimes.tooling)}</tr>
              <tr><th scope="row">Challenges for Mass Production</th>${readinessCell(productionChallenges.motor)}${readinessCell(productionChallenges.controlPCBA)}${readinessCell(productionChallenges.touchPCBA)}${readinessCell(productionChallenges.tooling)}</tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="ppt-section">
        <h4>Child Parts — Lead Time</h4>
        <div class="table-scroll">
          <table class="readiness-table child-parts-table">
            <thead><tr><th>Prototype</th><th>Mass Production</th><th>Investments</th></tr></thead>
            <tbody><tr>
              ${readinessCell(childPartsLeadTime.prototype ?? readiness.childPartsPrototypeLeadTime)}
              ${readinessCell(childPartsLeadTime.massProduction ?? readiness.childPartsMassProductionLeadTime)}
              ${readinessCell(childPartsLeadTime.investments ?? readiness.investments)}
            </tr></tbody>
          </table>
        </div>
      </section>
      <div class="ppt-updated">Updated on: ${escapeHTML(formatDate(lead.lastUpdated || lead.createdAt))}</div>
    </section>

  `;

}


function populateUpdateCustomerDropdown() {
  const custSelect = document.getElementById('updateCustomerSelect');
  if (!custSelect) return;
  const currentVal = custSelect.value;
  const customerNames = [...new Set(state.leads.map((l) => l.customerName).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  custSelect.innerHTML = '<option value="">-- Select Customer Name --</option>' +
    customerNames.map((name) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('');
  if (customerNames.includes(currentVal)) {
    custSelect.value = currentVal;
  }
}

function bindUpdateCustomerSelect() {
  const custSelect = document.getElementById('updateCustomerSelect');
  const prodGroup = document.getElementById('updateProductSelectGroup');
  const prodSelect = document.getElementById('updateProductSelect');
  if (!custSelect) return;

  custSelect.addEventListener('change', () => {
    const customerName = custSelect.value;
    if (!customerName) {
      state.editingLeadId = null;
      const form = document.getElementById('leadForm');
      if (form) form.reset();
      renderProfileEntryEditors();
      if (prodGroup) prodGroup.style.display = 'none';
      return;
    }

    const matchingLeads = state.leads.filter((l) => l.customerName === customerName);
    if (!matchingLeads.length) {
      showToast(`No saved leads found for ${customerName}`);
      return;
    }

    if (matchingLeads.length === 1) {
      if (prodGroup) prodGroup.style.display = 'none';
      populateFormWithLead(matchingLeads[0]);
      showToast(`Fetched lead details for ${customerName}`);
    } else {
      if (prodGroup) prodGroup.style.display = 'block';
      prodSelect.innerHTML = matchingLeads.map((l) =>
        `<option value="${escapeHTML(l.id)}">${escapeHTML(l.productName || l.partNumber || l.id)} (${escapeHTML(l.application || 'Lead')})</option>`
      ).join('');
      populateFormWithLead(matchingLeads[0]);
      showToast(`Fetched lead details for ${customerName}`);
    }
  });

  if (prodSelect) {
    prodSelect.addEventListener('change', () => {
      const leadId = prodSelect.value;
      const lead = state.leads.find((l) => l.id === leadId);
      if (lead) {
        populateFormWithLead(lead);
        showToast(`Loaded ${lead.productName || lead.partNumber || 'lead'}`);
      }
    });
  }
}

function populateFormWithLead(lead) {
  if (!lead) return;
  const form = document.getElementById('leadForm');
  state.editingLeadId = lead.id;
  state.isLoadingLead = true;
  form.reset();

  Object.entries(lead).forEach(([key, value]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.value = value ?? '';
  });

  const readiness = lead.operationalReadiness || {};
  const leadTimes = readiness.leadTime || {};
  const challenges = readiness.challengesForMassProduction || {};
  const readinessFields = {
    motorLeadTime: leadTimes.motor,
    controlPCBALeadTime: leadTimes.controlPCBA,
    touchPCBALeadTime: leadTimes.touchPCBA,
    toolingLeadTime: leadTimes.tooling,
    motorMassProductionChallenges: challenges.motor,
    controlPCBAMassProductionChallenges: challenges.controlPCBA,
    touchPCBAMassProductionChallenges: challenges.touchPCBA,
    toolingMassProductionChallenges: challenges.tooling,
    childPartsPrototypeLeadTime: readiness.childPartsLeadTime?.prototype ?? readiness.childPartsPrototypeLeadTime,
    childPartsMassProductionLeadTime: readiness.childPartsLeadTime?.massProduction ?? readiness.childPartsMassProductionLeadTime,
    massProductionInvestments: readiness.childPartsLeadTime?.investments ?? readiness.investments
  };
  Object.entries(readinessFields).forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) input.value = value ?? '';
  });

  ['technicalDiscussion', 'sampleGiven', 'rfqReceived', 'quoted'].forEach((name) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) input.value = String(Boolean(lead[name]));
  });

  const statusInput = form.querySelector('[name="status"]');
  if (statusInput) statusInput.value = lead.status || 'New Lead';

  renderProfileEntryEditors(lead.actionItems || [], lead.timeline || []);

  state.isLoadingLead = false;
  state.isDirty = false;
  document.getElementById('leadFormModeTag').textContent = 'Update mode';
  document.getElementById('updateLeadBtn').style.display = 'inline-flex';
  document.getElementById('saveLeadBtn').style.display = 'none';
}

function preloadLeadForEdit(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) return;
  setPage('updateLead');
  const custSelect = document.getElementById('updateCustomerSelect');
  if (custSelect) custSelect.value = lead.customerName;
  populateFormWithLead(lead);
}

function renderReports() {
  const total = state.leads.length;
  const won = state.leads.filter((lead) => lead.status === 'Won').length;
  const active = state.leads.filter((lead) => isLeadActive(lead)).length;
  const overdue = state.leads.filter((lead) => lead.followUpDate && new Date(lead.followUpDate) < new Date() && isLeadActive(lead)).length;
  const rfqLeads = state.leads.filter((lead) => lead.rfqReceived).length;

  const reportSummary = document.getElementById('reportSummary');
  reportSummary.innerHTML = `
    <div class="report-box"><h4>Total leads</h4><strong>${total}</strong><span>All tracked customers</span></div>
    <div class="report-box"><h4>Active</h4><strong>${active}</strong><span>Open opportunities</span></div>
    <div class="report-box"><h4>Won</h4><strong>${won}</strong><span>Closed business</span></div>
    <div class="report-box"><h4>Overdue</h4><strong>${overdue}</strong><span>Needs action</span></div>
    <div class="report-box"><h4>RFQ</h4><strong>${rfqLeads}</strong><span>Active requests</span></div>
  `;

  const reportLeadDetails = document.getElementById('reportLeadDetails');
  const reportLeadFilter = document.getElementById('reportLeadFilter');
  reportLeadFilter.value = state.reportFilter;
  reportLeadFilter.onchange = () => {
    state.reportFilter = reportLeadFilter.value;
    renderReports();
  };

  const now = new Date();
  const filteredLeads = state.leads.filter((lead) => {
    if (state.reportFilter === 'active') return isLeadActive(lead);
    if (state.reportFilter === 'follow-up') {
      return isLeadActive(lead) && lead.followUpDate && new Date(lead.followUpDate) <= now;
    }
    if (state.reportFilter === 'closed') return !isLeadActive(lead);
    return true;
  }).sort((a, b) => new Date(b.lastUpdated || b.createdAt || 0) - new Date(a.lastUpdated || a.createdAt || 0));

  document.getElementById('reportLeadCount').textContent = `${filteredLeads.length} ${filteredLeads.length === 1 ? 'lead' : 'leads'}`;
  if (!total) {
    reportLeadDetails.innerHTML = '<div class="empty-state">No leads available yet.</div>';
    return;
  }
  if (!filteredLeads.length) {
    reportLeadDetails.innerHTML = '<div class="empty-state">No leads match this filter.</div>';
    return;
  }

  reportLeadDetails.innerHTML = `
    <ul class="report-lead-list">
      ${filteredLeads.map((lead) => {
        const leadName = [lead.customerName, lead.productName].filter(Boolean).join(' — ') || 'Unnamed lead';
        const activity = leadActivityBadge(lead);
        return `
          <li>
            <button type="button" class="report-lead-link" data-report-lead="${escapeHTML(lead.id)}">
              <span class="report-lead-main">
                <span class="report-lead-name">${escapeHTML(leadName)}</span>
                <span class="report-lead-meta">
                  ${activity}
                  <span class="report-lead-status-text">${escapeHTML(lead.status || 'New Lead')}</span>
                </span>
              </span>
              <span class="report-lead-chevron" aria-hidden="true">›</span>
            </button>
          </li>
        `;
      }).join('')}
    </ul>
  `;

  reportLeadDetails.querySelectorAll('[data-report-lead]').forEach((button) => {
    button.addEventListener('click', () => openLeadProfile([button.dataset.reportLead]));
  });
}

function renderFollowUps() {
  const list = document.getElementById('followupBoard');
  const followUps = [...state.leads].filter((lead) => lead.followUpDate).sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  if (!followUps.length) {
    list.innerHTML = '<div class="empty-state">No follow-ups scheduled.</div>';
    return;
  }

  list.innerHTML = followUps.map((lead) => `
    <div class="list-item">
      <strong>${lead.customerName}</strong>
      <div class="muted">${lead.nextAction || 'Follow-up scheduled'} • ${formatDate(lead.followUpDate)}</div>
      <div class="list-item-status-row">
        ${leadActivityBadge(lead)}
        <span class="muted">${escapeHTML(lead.status || 'New Lead')} • ${escapeHTML(lead.responsiblePerson || 'Unassigned')}</span>
      </div>
    </div>
  `).join('');
}

function bindWindowEvents() {
  window.addEventListener('beforeunload', (event) => {
    if (state.isDirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

async function init() {
  applyAppSettings();
  bindNav();
  bindSettings();
  bindTabs();
  bindSearchPage();
  bindLeadForm();
  bindUpdateCustomerSelect();
  bindExcelLeadUpload();
  bindCustomerMaster();
  bindProductMaster();
  bindWindowEvents();
  setPage('findLeads');
  updateClock();
  setInterval(updateClock, 1000);
  await loadData();
}

window.addEventListener('DOMContentLoaded', init);
