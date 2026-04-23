import { getPanelData, addBibleSection, updateBibleSectionTitle, deleteBibleSection, addBibleRow, updateBibleRow, deleteBibleRow, addBibleContact, updateBibleContact, deleteBibleContact } from '../store.js';
import { h } from '../dom.js';

function buildRow(catId, sectionId, row) {
  const labelInp = h('input', { class: 'bv-row-label', value: row.label, placeholder: 'Field name' });
  labelInp.addEventListener('change', e => updateBibleRow(catId, sectionId, row.id, { label: e.target.value }));

  const valueInp = h('input', { class: 'bv-row-value', value: row.value, placeholder: '—' });
  valueInp.addEventListener('change', e => updateBibleRow(catId, sectionId, row.id, { value: e.target.value }));

  const del = h('button', { class: 'bv-del-btn', title: 'Remove row' }, '×');
  del.addEventListener('click', () => deleteBibleRow(catId, sectionId, row.id));

  return h('div', { class: 'bv-row' }, labelInp, valueInp, del);
}

function buildSection(catId, section) {
  const titleInp = h('input', { class: 'bv-section-title', value: section.title, placeholder: 'Section title' });
  titleInp.addEventListener('change', e => updateBibleSectionTitle(catId, section.id, e.target.value.trim() || section.title));

  const addRowBtn = h('button', { class: 'bv-action-btn', title: 'Add row' }, '+ Row');
  addRowBtn.addEventListener('click', () => addBibleRow(catId, section.id));

  const delSectionBtn = h('button', { class: 'bv-action-btn bv-action-del', title: 'Delete section' }, '× Section');
  delSectionBtn.addEventListener('click', () => deleteBibleSection(catId, section.id));

  const header = h('div', { class: 'bv-section-header' },
    titleInp,
    h('div', { class: 'bv-section-actions' }, addRowBtn, delSectionBtn),
  );

  const body = h('div', { class: 'bv-section-body' },
    ...section.rows.map(r => buildRow(catId, section.id, r)),
  );

  return h('div', { class: 'bv-section' }, header, body);
}

function buildContactsSection(catId, contacts) {
  const rows = contacts.map(c => {
    const cell = (key, placeholder) => {
      const inp = h('input', { class: 'bv-contact-cell', value: c[key] || '', placeholder });
      inp.addEventListener('change', e => updateBibleContact(catId, c.id, { [key]: e.target.value.trim() }));
      return h('td', null, inp);
    };
    const del = h('button', { class: 'bv-del-btn', title: 'Remove' }, '×');
    del.addEventListener('click', () => deleteBibleContact(catId, c.id));
    return h('tr', null,
      cell('role', 'Role'), cell('name', 'Name'), cell('company', 'Company'),
      cell('email', 'Email'), cell('phone', 'Phone'),
      h('td', { class: 'bv-contact-del-cell' }, del),
    );
  });

  const addBtn = h('button', { class: 'bv-action-btn', style: { marginTop: '8px' } }, '+ Add contact');
  addBtn.addEventListener('click', () => addBibleContact(catId, { role: '', name: '', company: '', email: '', phone: '' }));

  return h('div', { class: 'bv-section' },
    h('div', { class: 'bv-section-header' },
      h('span', { class: 'bv-section-title-fixed' }, 'Key Contacts'),
    ),
    h('div', { class: 'bv-section-body' },
      contacts.length
        ? h('div', { class: 'bv-table-scroll' },
            h('table', { class: 'bv-contacts-table' },
              h('thead', null, h('tr', null,
                h('th', null, 'Role'), h('th', null, 'Name'), h('th', null, 'Company'),
                h('th', null, 'Email'), h('th', null, 'Phone'), h('th', null, ''),
              )),
              h('tbody', null, ...rows),
            ),
          )
        : null,
      addBtn,
    ),
  );
}

export function buildBibleView(catId) {
  const cat = getPanelData().categories.find(c => c.id === catId);
  const bible = cat?.bible || {};
  const sections = Array.isArray(bible.sections) ? bible.sections : [];
  const contacts = Array.isArray(bible.contacts) ? bible.contacts : [];
  const frag = document.createDocumentFragment();

  sections.forEach(sec => frag.appendChild(buildSection(catId, sec)));
  frag.appendChild(buildContactsSection(catId, contacts));

  const addSecBtn = h('button', { class: 'bv-add-section-btn' }, '+ Add section');
  addSecBtn.addEventListener('click', () => addBibleSection(catId));
  frag.appendChild(addSecBtn);

  return frag;
}
