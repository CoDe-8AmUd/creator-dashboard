// =====================================================================
// 📅 CALENDAR MODULE — Visual Habit Tracker (Daily Log)
// Renders a monthly grid synced with Firestore-backed app state via the
// injected getData/save/toast/emptyStateEl dependencies (dependency
// injection keeps this module free of any direct DOM/Firebase coupling
// to the rest of the app).
// =====================================================================

export const SUPPLEMENTS = ["Zinc", "Vitamin D", "Magnesium", "Omega 3", "Creatine"];
export const TRAINING_TYPES = ["Push", "Pull", "Legs", "Football", "Padel"];

function todayStr(){
  return new Date().toISOString().slice(0, 10);
}

function dateKey(y, m, d){
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Creates a self-contained habit calendar bound to the given DOM ids and
 * host callbacks. Returns { render } — call render() whenever the Daily
 * Log tab becomes visible or habit data changes remotely.
 */
export function createHabitCalendar({ getData, save, toast, emptyStateEl, els }){
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth(); // 0-11
  let selectedDate = todayStr();

  function dayEntry(dateStr){
    const data = getData();
    if(!data.habitLog[dateStr]){
      data.habitLog[dateStr] = {
        supplements: Object.fromEntries(SUPPLEMENTS.map(s => [s, false])),
        training: Object.fromEntries(TRAINING_TYPES.map(t => [t, false]))
      };
    }
    return data.habitLog[dateStr];
  }

  function hasAny(entry, key){
    return entry && Object.values(entry[key] || {}).some(Boolean);
  }

  function render(){
    const grid = els.grid();
    const monthLabel = els.monthLabel();
    grid.innerHTML = "";

    const first = new Date(viewYear, viewMonth, 1);
    monthLabel.textContent = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const startDow = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = todayStr();
    const data = getData();

    for(let i = 0; i < startDow; i++){
      grid.append(document.createElement('div'));
    }

    for(let d = 1; d <= daysInMonth; d++){
      const ds = dateKey(viewYear, viewMonth, d);
      const entry = data.habitLog[ds];
      const suppOn = hasAny(entry, 'supplements');
      const trainOn = hasAny(entry, 'training');

      const cell = document.createElement('button');
      cell.type = "button";
      const isToday = ds === today;
      const isSelected = ds === selectedDate;

      let bg = "bg-panel2";
      if(suppOn && trainOn) bg = "";
      else if(suppOn) bg = "bg-emerald-500/70";
      else if(trainOn) bg = "bg-blue-500/70";

      cell.className = "aspect-square rounded-lg border text-sm flex items-center justify-center transition font-medium " + bg + " " +
        (isSelected ? "border-accent ring-2 ring-accent text-white" :
         isToday ? "border-accent2 text-white" :
         "border-border text-slate-300 hover:border-accent/50");
      if(suppOn && trainOn){
        cell.style.background = "linear-gradient(135deg, rgba(16,185,129,0.7) 50%, rgba(59,130,246,0.7) 50%)";
      }
      cell.textContent = d;
      cell.addEventListener('click', () => {
        selectedDate = ds;
        render();
      });
      grid.append(cell);
    }

    els.selectedDateLabel().textContent =
      new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    renderLists();
  }

  function renderToggleRow(label, checked, onToggle){
    const row = document.createElement('div');
    row.className = "flex items-center gap-3 bg-panel2 border border-border rounded-lg px-3 py-2";
    const check = document.createElement('button');
    check.type = "button";
    check.className = "w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 " +
      (checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-border text-transparent");
    check.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
    check.addEventListener('click', onToggle);
    const span = document.createElement('span');
    span.className = "flex-1 text-sm text-slate-200";
    span.textContent = label;
    row.append(check, span);
    return row;
  }

  function renderLists(){
    const entry = dayEntry(selectedDate);

    const suppWrap = els.supplementsList();
    suppWrap.innerHTML = "";
    SUPPLEMENTS.forEach(name => {
      suppWrap.append(renderToggleRow(name, !!entry.supplements[name], () => {
        entry.supplements[name] = !entry.supplements[name];
        save();
        render();
      }));
    });

    const trainWrap = els.trainingList();
    trainWrap.innerHTML = "";
    TRAINING_TYPES.forEach(name => {
      trainWrap.append(renderToggleRow(name, !!entry.training[name], () => {
        entry.training[name] = !entry.training[name];
        save();
        render();
      }));
    });
  }

  els.prevMonthBtn().addEventListener('click', () => {
    viewMonth--;
    if(viewMonth < 0){ viewMonth = 11; viewYear--; }
    render();
  });
  els.nextMonthBtn().addEventListener('click', () => {
    viewMonth++;
    if(viewMonth > 11){ viewMonth = 0; viewYear++; }
    render();
  });
  els.todayBtn().addEventListener('click', () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectedDate = todayStr();
    render();
  });

  return { render };
}
