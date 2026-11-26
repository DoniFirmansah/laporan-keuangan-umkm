import { MICROTASKS_LIST } from '../data/blueprintData.js';

export function renderMicrotasksView(container, state, { onStateChange }) {
  const epicFilter = state.microtaskEpic || 'Semua';
  const query = (state.microtaskQuery || '').trim().toLowerCase();
  const completedSet = new Set(state.completedMicrotasks || []);

  const epics = ['Semua', ...new Set(MICROTASKS_LIST.map((m) => m.epic))];
  const filtered = MICROTASKS_LIST.filter((m) => {
    const matchEpic = epicFilter === 'Semua' || m.epic === epicFilter;
    const matchQ =
      !query ||
      m.id.toLowerCase().includes(query) ||
      m.title.toLowerCase().includes(query) ||
      m.deliverable.toLowerCase().includes(query);
    return matchEpic && matchQ;
  });

  const doneCount = MICROTASKS_LIST.filter((m) => completedSet.has(m.id)).length;
  const pct = Math.round((doneCount / MICROTASKS_LIST.length) * 100);

  container.innerHTML = `
    <section class="ledger-balance-strip">
      <div class="strip-equation">
        <div class="strip-item">
          <span class="strip-label">Total Microtasks</span>
          <span class="strip-val">${MICROTASKS_LIST.length} Paket</span>
        </div>
        <div class="strip-item">
          <span class="strip-label">Selesai</span>
          <span class="strip-val">${doneCount} / ${MICROTASKS_LIST.length} (${pct}%)</span>
        </div>
      </div>
      <div style="min-width:180px;flex:0 1 260px;">
        <div class="meter-track"><div class="meter-fill" style="width:${pct}%"></div></div>
      </div>
    </section>

    <section class="panel">
      <div class="toolbar" style="margin-bottom:16px;">
        <div class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="mt-search" type="search" value="${query}" placeholder="Cari ID, microtask, atau artefak..." aria-label="Cari microtask" />
        </div>

        <select id="mt-epic" style="max-width:290px;" aria-label="Filter Epic">
          ${epics.map((ep) => `<option value="${ep}" ${ep === epicFilter ? 'selected' : ''}>${ep}</option>`).join('')}
        </select>
      </div>

      ${
        filtered.length === 0
          ? `<div class="empty-state">Tidak ada microtask yang cocok dengan pencarian Anda.</div>`
          : `
          <div class="table-wrap">
            <table class="ledger-table">
              <thead>
                <tr>
                  <th style="width:52px">Cek</th>
                  <th style="width:82px">ID</th>
                  <th>Epic</th>
                  <th>Judul Microtask</th>
                  <th>Artefak</th>
                  <th style="width:110px">Status</th>
                </tr>
              </thead>
              <tbody>
                ${filtered
                  .map((m) => {
                    const isDone = completedSet.has(m.id);
                    return `
                      <tr>
                        <td>
                          <input type="checkbox" data-mt-id="${m.id}" ${isDone ? 'checked' : ''} aria-label="Tandai ${m.id} selesai" />
                        </td>
                        <td class="code-tag">${m.id}</td>
                        <td><span class="badge badge-neutral">${m.epic}</span></td>
                        <td>${m.title}</td>
                        <td class="code-tag">${m.deliverable}</td>
                        <td>
                          <span class="badge ${isDone ? 'badge-ok' : 'badge-warn'}">${isDone ? 'Selesai' : 'Pending'}</span>
                        </td>
                      </tr>`;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>`
      }
    </section>
  `;

  container.querySelector('#mt-epic')?.addEventListener('change', (e) => {
    onStateChange({ microtaskEpic: e.target.value });
  });

  const searchInp = container.querySelector('#mt-search');
  if (searchInp) {
    let t = null;
    searchInp.addEventListener('input', (e) => {
      clearTimeout(t);
      t = setTimeout(() => onStateChange({ microtaskQuery: e.target.value }), 180);
    });
  }

  container.querySelectorAll('[data-mt-id]').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const next = new Set(state.completedMicrotasks || []);
      if (e.target.checked) next.add(chk.dataset.mtId);
      else next.delete(chk.dataset.mtId);
      onStateChange({ completedMicrotasks: [...next] });
    });
  });
}
