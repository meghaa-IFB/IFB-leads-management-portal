const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const defaultStore = {
  customers: [],
  products: [],
  leads: []
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultStore, null, 2));
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
}

function writeStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

function normalizeLead(input) {
  const today = new Date().toISOString().slice(0, 10);
  const status = input.status || 'New Lead';
  const createdAt = input.createdAt || today;
  const lastUpdated = input.lastUpdated || today;
  const existingReadiness = input.operationalReadiness || {};
  const existingParameters = Array.isArray(existingReadiness.parameters) ? existingReadiness.parameters : [];
  const booleanValue = (value) => value === true
    || value === 1
    || ['true', 'yes', '1'].includes(String(value).trim().toLowerCase());
  const readinessValue = (key, property) => {
    const legacyParameter = existingParameters.find((item) => item.parameter === key)?.[property];
    return input[`${key}${property === 'leadTime' ? 'LeadTime' : 'MassProductionChallenges'}`]
      ?? existingReadiness[property]?.[key]
      ?? legacyParameter
      ?? '';
  };
  return {
    id: input.id || `lead-${Date.now()}`,
    customerName: input.customerName || '',
    customerCode: input.customerCode || '',
    productName: input.productName || '',
    application: input.application || '',
    partNumber: input.partNumber || '',
    productDescription: input.productDescription || '',
    contactPersonName: input.contactPersonName || '',
    contactPersonDesignation: input.contactPersonDesignation || '',
    contactNumber: input.contactNumber || '',
    email: input.email || '',
    officeLocation: input.officeLocation || '',
    manufacturingUnitLocation: input.manufacturingUnitLocation || '',
    promoters: input.promoters || '',
    currentProductScope: input.currentProductScope || '',
    otherProductScope: input.otherProductScope || '',
    relationshipBackground: input.relationshipBackground || '',
    marketIntelligence: input.marketIntelligence || '',
    annualVolumePotential: Number(input.annualVolumePotential || 0),
    expectedInitialVolume: Number(input.expectedInitialVolume || 0),
    inductionModels: input.inductionModels || '',
    BLDCModels: input.BLDCModels || '',
    scheduleReceivedDate: input.scheduleReceivedDate || '',
    scheduleStartMonth: input.scheduleStartMonth || '',
    scheduleEndMonth: input.scheduleEndMonth || '',
    scheduleVersion: input.scheduleVersion || '',
    deliveryMonth: input.deliveryMonth || input.scheduleStartMonth || '',
    monthlySchedule: Array.isArray(input.monthlySchedule)
      ? input.monthlySchedule.map((item) => ({
        month: item.month || '',
        quantity: Number(item.quantity || 0)
      }))
      : [],
    actualProductionQty: Number(input.actualProductionQty || 0),
    actualDispatchQty: Number(input.actualDispatchQty || 0),
    dispatchDate: input.dispatchDate || '',
    varianceReason: input.varianceReason || '',
    originalCustomerSchedule: Number(input.originalCustomerSchedule || 0),
    currentCustomerSchedule: Number(input.currentCustomerSchedule || 0),
    actualDispatch: Number(input.actualDispatch || 0),
    netCustomerRevision: Number(input.netCustomerRevision || 0),
    finalScheduleVariance: Number(input.finalScheduleVariance || 0),
    achievement: Number(input.achievement || 0),
    technicalDiscussion: booleanValue(input.technicalDiscussion),
    motorTechnology: input.motorTechnology || '',
    wattage: input.wattage || '',
    stackSize: input.stackSize || '',
    formFactor: input.formFactor || '',
    validationStatus: input.validationStatus || 'Not Started',
    technicalRemarks: input.technicalRemarks || '',
    sampleGiven: booleanValue(input.sampleGiven),
    sampleQuantity: Number(input.sampleQuantity || 0),
    sampleDate: input.sampleDate || '',
    rfqReceived: booleanValue(input.rfqReceived),
    rfqDate: input.rfqDate || '',
    quoted: booleanValue(input.quoted),
    quotedPrice: Number(input.quotedPrice || 0),
    quotationDate: input.quotationDate || '',
    quotationRevision: input.quotationRevision || '',
    commercialRemarks: input.commercialRemarks || '',
    actionItems: Array.isArray(input.actionItems) ? input.actionItems : [],
    operationalReadiness: {
      leadTime: {
        motor: readinessValue('motor', 'leadTime'),
        controlPCBA: readinessValue('controlPCBA', 'leadTime'),
        touchPCBA: readinessValue('touchPCBA', 'leadTime'),
        tooling: readinessValue('tooling', 'leadTime')
      },
      challengesForMassProduction: {
        motor: readinessValue('motor', 'challengesForMassProduction'),
        controlPCBA: readinessValue('controlPCBA', 'challengesForMassProduction'),
        touchPCBA: readinessValue('touchPCBA', 'challengesForMassProduction'),
        tooling: readinessValue('tooling', 'challengesForMassProduction')
      },
      childPartsLeadTime: {
        prototype: input.childPartsPrototypeLeadTime ?? existingReadiness.childPartsLeadTime?.prototype ?? existingReadiness.childPartsPrototypeLeadTime ?? '',
        massProduction: input.childPartsMassProductionLeadTime ?? existingReadiness.childPartsLeadTime?.massProduction ?? existingReadiness.childPartsMassProductionLeadTime ?? '',
        investments: input.massProductionInvestments ?? existingReadiness.childPartsLeadTime?.investments ?? existingReadiness.investments ?? ''
      }
    },
    status,
    responsiblePerson: input.responsiblePerson || '',
    leadSource: input.leadSource || '',
    createdAt,
    lastUpdated,
    followUpDate: input.followUpDate || '',
    nextAction: input.nextAction || '',
    statusHistory: Array.isArray(input.statusHistory) && input.statusHistory.length
      ? input.statusHistory
      : [{ date: createdAt, status, notes: 'Lead created' }],
    timeline: Array.isArray(input.timeline) && (input.timeline.length > 0 || (input.id && input.createdAt))
      ? input.timeline
      : [{ date: createdAt, title: 'Lead created', details: 'Lead record initialized.' }]
  };
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.get('/vendor/xlsx.full.min.js', (req, res, next) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'xlsx', 'dist', 'xlsx.full.min.js'), (error) => {
    if (error) next(error);
  });
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'IFB lead management API is running', timestamp: new Date().toISOString() });
});

app.get('/api/customers', (req, res) => {
  const store = readStore();
  res.json(store.customers || []);
});

app.get('/api/products', (req, res) => {
  const store = readStore();
  res.json(store.products || []);
});

app.get('/api/leads', (req, res) => {
  const store = readStore();
  res.json(store.leads || []);
});

app.get('/api/leads/:id', (req, res) => {
  const store = readStore();
  const lead = (store.leads || []).find((item) => item.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

app.get('/api/dashboard', (req, res) => {
  const store = readStore();
  res.json({
    customers: store.customers || [],
    products: store.products || [],
    leads: store.leads || []
  });
});

app.post('/api/customers', (req, res) => {
  const store = readStore();
  const customer = {
    id: req.body.id || `cust-${Date.now()}`,
    customerName: req.body.customerName || '',
    customerCode: req.body.customerCode || '',
    category: req.body.category || 'OEM',
    location: req.body.location || '',
    primaryContact: req.body.primaryContact || '',
    phone: req.body.phone || '',
    email: req.body.email || '',
    notes: req.body.notes || ''
  };

  if (!customer.customerName || !customer.customerCode) {
    return res.status(400).json({ error: 'Customer name and code are required.' });
  }

  store.customers = [...(store.customers || []), customer];
  writeStore(store);
  res.status(201).json(customer);
});

app.put('/api/customers/:id', (req, res) => {
  const store = readStore();
  const index = (store.customers || []).findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Customer not found.' });

  const next = {
    ...store.customers[index],
    ...req.body,
    id: req.params.id
  };

  store.customers[index] = next;
  writeStore(store);
  res.json(next);
});

app.post('/api/products', (req, res) => {
  const store = readStore();
  const product = {
    id: req.body.id || `prod-${Date.now()}`,
    productName: req.body.productName || '',
    application: req.body.application || '',
    partNumber: req.body.partNumber || '',
    description: req.body.description || '',
    category: req.body.category || 'Motor',
    status: req.body.status || 'Active'
  };

  if (!product.productName || !product.partNumber) {
    return res.status(400).json({ error: 'Product name and part number are required.' });
  }

  store.products = [...(store.products || []), product];
  writeStore(store);
  res.status(201).json(product);
});

app.put('/api/products/:id', (req, res) => {
  const store = readStore();
  const index = (store.products || []).findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found.' });

  const next = {
    ...store.products[index],
    ...req.body,
    id: req.params.id
  };

  store.products[index] = next;
  writeStore(store);
  res.json(next);
});

app.post('/api/leads', (req, res) => {
  const store = readStore();
  const lead = normalizeLead(req.body);

  if (!lead.customerName || !lead.productName) {
    return res.status(400).json({ error: 'Customer and product are required.' });
  }

  store.leads = [...(store.leads || []), lead];
  writeStore(store);
  res.status(201).json(lead);
});

app.post('/api/leads/import', (req, res) => {
  const rows = req.body.leads;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'The workbook contains no lead rows to import.' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ error: 'Import a maximum of 500 leads at a time.' });
  }
  if (rows.some((row) => !row || typeof row !== 'object' || !row.lead || typeof row.lead !== 'object')) {
    return res.status(400).json({ error: 'The workbook contains an invalid lead row. No leads were imported.' });
  }

  const normalizedLeads = rows.map((row, index) => normalizeLead({
    ...row.lead,
    id: `lead-${Date.now()}-${index + 1}`
  }));
  const invalidRows = normalizedLeads
    .map((lead, index) => ({
      rowNumber: Number(rows[index].rowNumber) || index + 2,
      lead
    }))
    .filter(({ lead }) => !lead.customerName || !lead.productName);

  if (invalidRows.length) {
    const rowNumbers = invalidRows.map(({ rowNumber }) => rowNumber).join(', ');
    return res.status(400).json({
      error: `Import canceled. Customer and product details are missing in spreadsheet row(s): ${rowNumbers}.`
    });
  }

  const store = readStore();
  store.leads = [...(store.leads || []), ...normalizedLeads];
  writeStore(store);
  res.status(201).json({ imported: normalizedLeads.length });
});

app.put('/api/leads/:id', (req, res) => {
  const store = readStore();
  const index = (store.leads || []).findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Lead not found.' });

  const nextLead = normalizeLead({
    ...store.leads[index],
    ...req.body,
    id: req.params.id,
    lastUpdated: new Date().toISOString().slice(0, 10),
    statusHistory: Array.isArray(req.body.statusHistory) ? req.body.statusHistory : store.leads[index].statusHistory,
    timeline: Array.isArray(req.body.timeline) ? req.body.timeline : store.leads[index].timeline
  });

  store.leads[index] = nextLead;
  writeStore(store);
  res.json(nextLead);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port) {
  app.listen(port, () => {
    console.log(`IFB lead management portal running on http://localhost:${port}`);
  }).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.log(`Port ${port} is busy, retrying on ${nextPort}`);
      startServer(nextPort);
      return;
    }
    throw error;
  });
}

startServer(DEFAULT_PORT);
