(function () {
  "use strict";

  var STORAGE_KEY = "personalAppPrototype.v1";
  var PAGE_NAMES = ["home", "meals", "food-select", "todos", "profile"];
  var mealLabels = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐" };
  var mealEnglishLabels = { breakfast: "BREAKFAST", lunch: "LUNCH", dinner: "DINNER" };
  var mealNumbers = { breakfast: "01", lunch: "02", dinner: "03" };
  var categories = [
    { id: "staple", name: "主食" },
    { id: "meat", name: "肉类" },
    { id: "vegetable", name: "蔬菜" },
    { id: "drink", name: "饮品" },
    { id: "fruit", name: "水果" }
  ];
  var foods = {
    rice: { id: "rice", name: "米饭", category: "staple" },
    bread: { id: "bread", name: "全麦面包", category: "staple" },
    oatmeal: { id: "oatmeal", name: "燕麦粥", category: "staple" },
    noodles: { id: "noodles", name: "面条", category: "staple" },
    chicken: { id: "chicken", name: "鸡胸肉", category: "meat" },
    egg: { id: "egg", name: "鸡蛋", category: "meat" },
    broccoli: { id: "broccoli", name: "西兰花", category: "vegetable" },
    greens: { id: "greens", name: "青菜", category: "vegetable" },
    milk: { id: "milk", name: "牛奶", category: "drink" }
  };

  var weekdayNamesZh = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  var weekdayNamesEn = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  function pad(number) { return String(number).padStart(2, "0"); }
  function toDateKey(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }
  function parseDateKey(key) {
    var parts = key.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  function makeId(prefix) { return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7); }
  function makeMeal(foodId, id) { return { id: id || makeId("meal-item"), foodId: foodId, name: foods[foodId].name }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  // 展示用日期辅助函数（纯展示，不参与日期逻辑运算）
  function formatFullDateZh(date) {
    return date.getFullYear() + " 年 " + (date.getMonth() + 1) + " 月 " + date.getDate() + " 日";
  }
  function formatShortDate(date) {
    return pad(date.getMonth() + 1) + "." + pad(date.getDate());
  }
  function formatWeekdayZh(date) {
    return weekdayNamesZh[date.getDay()];
  }
  function formatWeekdayEn(date) {
    return weekdayNamesEn[date.getDay()];
  }
  function formatTodoSelectedDate(key) {
    var d = parseDateKey(key);
    return pad(d.getMonth() + 1) + " 月 " + pad(d.getDate()) + " 日 · " + formatWeekdayZh(d);
  }

  var now = new Date();
  var todayKey = toDateKey(now);
  var defaultData = {
    meals: {
      breakfast: [makeMeal("milk", "meal-b-1"), makeMeal("milk", "meal-b-2"), makeMeal("milk", "meal-b-3")],
      lunch: [makeMeal("rice", "meal-l-1"), makeMeal("chicken", "meal-l-2"), makeMeal("broccoli", "meal-l-3")],
      dinner: [makeMeal("noodles", "meal-d-1"), makeMeal("egg", "meal-d-2"), makeMeal("greens", "meal-d-3")]
    },
    tasksByDate: {}
  };
  defaultData.tasksByDate[todayKey] = [
    { id: "todo-1", title: "今日任务", completed: false },
    { id: "todo-2", title: "阅读30分钟", completed: false }
  ];

  var state = {
    currentPage: "home",
    selectedDate: todayKey,
    calendarMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    mealEditMode: false,
    targetMeal: null,
    selectedCategory: "staple",
    meals: clone(defaultData.meals),
    tasksByDate: clone(defaultData.tasksByDate),
    profile: { name: "小满", phone: "138****8888" },
    enteredFoodSelectFromMeals: false,
    pendingMealScroll: null
  };

  var toastTimer = null;
  var previouslyFocusedElement = null;
  var els = {
    pages: Array.prototype.slice.call(document.querySelectorAll(".page")),
    nav: document.getElementById("bottom-nav"),
    navButtons: Array.prototype.slice.call(document.querySelectorAll("[data-nav]")),
    homeTodoCount: document.getElementById("home-todo-count"),
    homeTodoList: document.getElementById("home-todo-list"),
    homeNextMeal: document.getElementById("home-next-meal"),
    homeNextMealList: document.getElementById("home-next-meal-list"),
    homeWeekdayEn: document.getElementById("home-weekday-en"),
    homeDateShort: document.getElementById("home-date-short"),
    homeDateFull: document.getElementById("home-date-full"),
    mealEditToggle: document.getElementById("meal-edit-toggle"),
    mealsContent: document.getElementById("meals-content"),
    backToMeals: document.getElementById("back-to-meals"),
    mealTargetLabel: document.getElementById("meal-target-label"),
    mealTargetEn: document.getElementById("meal-target-en"),
    categories: document.getElementById("food-categories"),
    foodList: document.getElementById("food-list"),
    calendarTitle: document.getElementById("calendar-title"),
    calendarDays: document.getElementById("calendar-days"),
    previousMonth: document.getElementById("previous-month"),
    nextMonth: document.getElementById("next-month"),
    taskForm: document.getElementById("task-form"),
    taskInput: document.getElementById("task-input"),
    todoList: document.getElementById("todo-list"),
    todoSelectedDateLabel: document.getElementById("todo-selected-date-label"),
    todoCountBadge: document.getElementById("todo-count-badge"),
    toast: document.getElementById("toast"),
    logoutButton: document.getElementById("logout-button"),
    logoutModal: document.getElementById("logout-modal"),
    cancelLogout: document.getElementById("cancel-logout"),
    confirmLogout: document.getElementById("confirm-logout")
  };

  function loadSavedData() {
    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      var parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object") return;

      if (parsed.meals && typeof parsed.meals === "object") {
        ["breakfast", "lunch", "dinner"].forEach(function (meal) {
          if (!Array.isArray(parsed.meals[meal])) return;
          state.meals[meal] = parsed.meals[meal]
            .filter(function (item) { return item && typeof item.id === "string" && foods[item.foodId]; })
            .map(function (item) { return makeMeal(item.foodId, item.id); });
        });
      }

      if (parsed.tasksByDate && typeof parsed.tasksByDate === "object" && !Array.isArray(parsed.tasksByDate)) {
        var cleanedTasks = {};
        Object.keys(parsed.tasksByDate).forEach(function (date) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(parsed.tasksByDate[date])) return;
          cleanedTasks[date] = parsed.tasksByDate[date]
            .filter(function (task) { return task && typeof task.id === "string" && typeof task.title === "string" && task.title.trim(); })
            .map(function (task) { return { id: task.id, title: task.title.slice(0, 50), completed: Boolean(task.completed) }; });
        });
        state.tasksByDate = cleanedTasks;
      }
    } catch (error) {
      // 本地存储不可用或数据损坏时，保持内存中的默认演示数据。
    }
  }

  function saveData() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ meals: state.meals, tasksByDate: state.tasksByDate }));
    } catch (error) {
      // 隐私模式或受限环境下继续以内存状态演示。
    }
  }

  function getTasks(date) { return state.tasksByDate[date] || []; }

  // 渲染单个餐品卡片（使用独立本地素材 assets/food/{foodId}.png）
  function foodItemMarkup(item, options) {
    var opt = options || {};
    var showDelete = opt.showDelete;
    var meal = opt.meal;
    var foodData = foods[item.foodId];
    var foodName = foodData ? foodData.name : item.name;

    var deleteBtn = showDelete
      ? "<button class=\"delete-food\" type=\"button\" data-action=\"delete-food\" data-meal=\"" + meal + "\" data-item-id=\"" + escapeHtml(item.id) + "\" aria-label=\"删除“" + escapeHtml(foodName) + "”\">×</button>"
      : "";

    return "<div class=\"food\">" +
      "<div class=\"photo\" role=\"img\" aria-label=\"" + escapeHtml(foodName) + "\">" +
        deleteBtn +
        "<img class=\"food-img\" src=\"assets/food/" + encodeURIComponent(item.foodId) + ".png\" alt=\"" + escapeHtml(foodName) + "\" onerror=\"this.style.display='none'\">" +
      "</div>" +
      "<span class=\"food-name\">" + escapeHtml(foodName) + "</span>" +
    "</div>";
  }

  function renderHome() {
    var today = new Date();
    if (els.homeWeekdayEn) els.homeWeekdayEn.textContent = formatWeekdayEn(today);
    if (els.homeDateShort) els.homeDateShort.textContent = formatShortDate(today);
    if (els.homeDateFull) els.homeDateFull.textContent = formatFullDateZh(today);

    var openTasks = getTasks(todayKey).filter(function (task) { return !task.completed; });
    els.homeTodoCount.textContent = openTasks.length + " 项待完成";
    if (openTasks.length) {
      els.homeTodoList.innerHTML = openTasks.slice(0, 2).map(function (task) {
        return "<div class=\"task-row\">" +
          "<button class=\"check\" type=\"button\" data-home-task=\"" + escapeHtml(task.id) + "\" aria-label=\"完成“" + escapeHtml(task.title) + "”\"></button>" +
          "<span class=\"task-title\">" + escapeHtml(task.title) + "</span>" +
        "</div>";
      }).join("") + "<button class=\"textlink\" type=\"button\" data-action=\"view-all\">查看全部 ↗</button>";
    } else {
      els.homeTodoList.innerHTML = "<div class=\"empty\">今天没有待办</div>" +
        "<button class=\"textlink\" type=\"button\" data-action=\"view-all\">查看全部 ↗</button>";
    }

    var lunch = state.meals.lunch.slice(0, 3);
    els.homeNextMealList.innerHTML = lunch.length
      ? lunch.map(function (item) { return foodItemMarkup(item); }).join("")
      : "<div class=\"empty\">暂未添加餐品</div>";
  }

  function renderMeals() {
    els.mealEditToggle.textContent = state.mealEditMode ? "完成" : "修改";
    els.mealsContent.innerHTML = ["breakfast", "lunch", "dinner"].map(function (meal) {
      var items = state.meals[meal];
      var content = items.length
        ? "<div class=\"panel food-grid\">" + items.map(function (item) {
            return foodItemMarkup(item, { showDelete: state.mealEditMode, meal: meal });
          }).join("") + "</div>"
        : "<div class=\"panel food-grid\"><div class=\"empty\" style=\"grid-column: 1 / -1;\">暂未添加餐品</div></div>";

      return "<section id=\"" + meal + "-section\" class=\"meal-block\">" +
        "<div class=\"meal-top\">" +
          "<span class=\"num\">" + mealNumbers[meal] + "</span>" +
          "<h3>" + mealLabels[meal] + "</h3>" +
          "<button class=\"plus\" type=\"button\" data-action=\"add-food\" data-meal=\"" + meal + "\" aria-label=\"添加" + mealLabels[meal] + "餐品\">+</button>" +
        "</div>" +
        content +
      "</section>";
    }).join("");
  }

  function renderFoodSelect() {
    var targetMeal = mealLabels[state.targetMeal] ? state.targetMeal : "lunch";
    state.targetMeal = targetMeal;
    els.mealTargetLabel.textContent = "当前将加入 · " + mealLabels[targetMeal];
    if (els.mealTargetEn) els.mealTargetEn.textContent = mealEnglishLabels[targetMeal];

    els.categories.innerHTML = categories.map(function (category) {
      var isActive = state.selectedCategory === category.id;
      return "<button class=\"" + (isActive ? "active" : "") + "\" type=\"button\" data-category=\"" + category.id + "\" aria-pressed=\"" + (isActive ? "true" : "false") + "\">" + category.name + "</button>";
    }).join("");

    var list = Object.keys(foods).map(function (id) { return foods[id]; }).filter(function (food) { return food.category === state.selectedCategory; });
    if (!list.length) {
      els.foodList.innerHTML = "<div class=\"panel empty select-empty\">暂无可选水果</div>";
      return;
    }
    els.foodList.innerHTML = list.map(function (food) {
      return "<article class=\"food-choice\">" +
        "<div class=\"photo\" role=\"img\" aria-label=\"" + escapeHtml(food.name) + "\">" +
          "<img class=\"food-img\" src=\"assets/food/" + encodeURIComponent(food.id) + ".png\" alt=\"" + escapeHtml(food.name) + "\" onerror=\"this.style.display='none'\">" +
        "</div>" +
        "<div class=\"choice-info\">" +
          "<strong>" + escapeHtml(food.name) + "</strong>" +
          "<button class=\"plus\" type=\"button\" data-action=\"select-food\" data-food=\"" + food.id + "\" aria-label=\"添加" + escapeHtml(food.name) + "到" + mealLabels[targetMeal] + "\">+</button>" +
        "</div>" +
      "</article>";
    }).join("");
  }

  function renderCalendar() {
    var year = state.calendarMonth.getFullYear();
    var month = state.calendarMonth.getMonth();
    var firstWeekday = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    els.calendarTitle.textContent = year + " 年 " + (month + 1) + " 月";

    var html = "";
    for (var blank = 0; blank < firstWeekday; blank += 1) {
      html += "<span class=\"calendar-blank\" aria-hidden=\"true\"></span>";
    }
    for (var day = 1; day <= daysInMonth; day += 1) {
      var key = year + "-" + pad(month + 1) + "-" + pad(day);
      var isSelected = key === state.selectedDate;
      html += "<button class=\"day" + (isSelected ? " selected" : "") + "\" type=\"button\" data-date=\"" + key + "\" aria-label=\"" + year + "年" + (month + 1) + "月" + day + "日\" aria-pressed=\"" + (isSelected ? "true" : "false") + "\">" + day + "</button>";
    }
    els.calendarDays.innerHTML = html;
  }

  function renderTodoList() {
    var tasks = getTasks(state.selectedDate);
    var openCount = tasks.filter(function (t) { return !t.completed; }).length;

    if (els.todoSelectedDateLabel) {
      els.todoSelectedDateLabel.textContent = formatTodoSelectedDate(state.selectedDate);
    }
    if (els.todoCountBadge) {
      els.todoCountBadge.textContent = openCount + " 项待完成";
    }

    if (tasks.length) {
      els.todoList.innerHTML = tasks.map(function (task) {
        return "<div class=\"task-row" + (task.completed ? " done" : "") + "\">" +
          "<button class=\"check" + (task.completed ? " done" : "") + "\" type=\"button\" data-task-id=\"" + escapeHtml(task.id) + "\" aria-label=\"" + (task.completed ? "恢复“" : "完成“") + escapeHtml(task.title) + "”\"></button>" +
          "<span class=\"task-title\">" + escapeHtml(task.title) + "</span>" +
        "</div>";
      }).join("");
    } else {
      els.todoList.innerHTML = "<div class=\"empty\">暂无任务</div>";
    }
  }

  function renderTodos() {
    renderCalendar();
    renderTodoList();
  }

  function renderCurrentPage() {
    if (state.currentPage === "home") renderHome();
    if (state.currentPage === "meals") renderMeals();
    if (state.currentPage === "food-select") renderFoodSelect();
    if (state.currentPage === "todos") renderTodos();
  }

  function renderLinkedViews() {
    renderHome();
    renderMeals();
    renderTodos();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 1900);
  }

  function setSelectedDate(key) {
    var pieces = key.split("-");
    state.selectedDate = key;
    state.calendarMonth = new Date(Number(pieces[0]), Number(pieces[1]) - 1, 1);
  }

  function setTodosToToday() { setSelectedDate(todayKey); }

  function navigate(page) {
    var destination = PAGE_NAMES.indexOf(page) !== -1 ? page : "home";
    var hash = "#" + destination;
    if (window.location.hash === hash) applyRoute();
    else window.location.hash = hash;
  }

  function applyRoute() {
    var requested = window.location.hash.replace(/^#/, "");
    var page = PAGE_NAMES.indexOf(requested) !== -1 ? requested : "home";
    if (requested !== page) {
      window.location.hash = "#home";
      return;
    }
    if (page === "food-select" && !mealLabels[state.targetMeal]) state.targetMeal = "lunch";
    state.currentPage = page;
    els.pages.forEach(function (element) { element.classList.toggle("is-active", element.dataset.page === page); });
    els.nav.classList.toggle("is-hidden", page === "food-select");
    els.navButtons.forEach(function (button) {
      var isActive = button.dataset.nav === page;
      button.classList.toggle("active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
    renderCurrentPage();
    window.scrollTo(0, 0);
    if (page === "meals" && state.pendingMealScroll) {
      var target = state.pendingMealScroll;
      state.pendingMealScroll = null;
      window.requestAnimationFrame(function () {
        var section = document.getElementById(target + "-section");
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function findTask(date, id) { return getTasks(date).filter(function (task) { return task.id === id; })[0]; }

  function toggleTask(date, id) {
    var task = findTask(date, id);
    if (!task) return;
    task.completed = !task.completed;
    saveData();
    renderLinkedViews();
  }

  function deleteFood(meal, id) {
    if (!state.meals[meal]) return;
    var before = state.meals[meal].length;
    state.meals[meal] = state.meals[meal].filter(function (item) { return item.id !== id; });
    if (state.meals[meal].length === before) return;
    saveData();
    renderLinkedViews();
    showToast("已删除餐品");
  }

  function addFood(foodId) {
    if (!foods[foodId]) return;
    if (!mealLabels[state.targetMeal]) state.targetMeal = "lunch";
    state.meals[state.targetMeal].push(makeMeal(foodId));
    saveData();
    renderLinkedViews();
    showToast("已加入" + mealLabels[state.targetMeal]);
  }

  function openLogoutModal() {
    previouslyFocusedElement = document.activeElement;
    els.logoutModal.classList.add("is-open");
    els.logoutModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    els.cancelLogout.focus();
  }

  function closeLogoutModal() {
    if (!els.logoutModal.classList.contains("is-open")) return;
    els.logoutModal.classList.remove("is-open");
    els.logoutModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") previouslyFocusedElement.focus();
  }

  els.navButtons.forEach(function (button) {
    button.addEventListener("click", function () { navigate(button.dataset.nav); });
  });

  els.homeTodoList.addEventListener("click", function (event) {
    var taskButton = event.target.closest("[data-home-task]");
    if (taskButton) { toggleTask(todayKey, taskButton.dataset.homeTask); return; }
    if (event.target.closest("[data-action='view-all']")) { setTodosToToday(); navigate("todos"); }
  });

  els.homeNextMeal.addEventListener("click", function () { state.pendingMealScroll = "lunch"; navigate("meals"); });
  els.mealEditToggle.addEventListener("click", function () { state.mealEditMode = !state.mealEditMode; renderMeals(); });

  els.mealsContent.addEventListener("click", function (event) {
    var addButton = event.target.closest("[data-action='add-food']");
    var deleteButton = event.target.closest("[data-action='delete-food']");
    if (deleteButton) { deleteFood(deleteButton.dataset.meal, deleteButton.dataset.itemId); return; }
    if (addButton) {
      state.targetMeal = addButton.dataset.meal;
      state.enteredFoodSelectFromMeals = true;
      navigate("food-select");
    }
  });

  els.backToMeals.addEventListener("click", function () {
    if (state.enteredFoodSelectFromMeals && window.history.length > 1) {
      state.enteredFoodSelectFromMeals = false;
      window.history.back();
    } else {
      navigate("meals");
    }
  });

  els.categories.addEventListener("click", function (event) {
    var button = event.target.closest("[data-category]");
    if (!button) return;
    state.selectedCategory = button.dataset.category;
    renderFoodSelect();
  });
  els.foodList.addEventListener("click", function (event) {
    var button = event.target.closest("[data-action='select-food']");
    if (button) addFood(button.dataset.food);
  });

  els.previousMonth.addEventListener("click", function () {
    var current = state.calendarMonth;
    state.calendarMonth = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    state.selectedDate = toDateKey(state.calendarMonth);
    renderTodos();
  });
  els.nextMonth.addEventListener("click", function () {
    var current = state.calendarMonth;
    state.calendarMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    state.selectedDate = toDateKey(state.calendarMonth);
    renderTodos();
  });
  els.calendarDays.addEventListener("click", function (event) {
    var button = event.target.closest("[data-date]");
    if (!button) return;
    state.selectedDate = button.dataset.date;
    renderTodos();
  });

  els.taskForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var title = els.taskInput.value.trim();
    if (!title) {
      els.taskForm.classList.remove("is-invalid");
      window.requestAnimationFrame(function () { els.taskForm.classList.add("is-invalid"); });
      showToast("请输入任务内容");
      els.taskInput.focus();
      return;
    }
    if (!state.tasksByDate[state.selectedDate]) state.tasksByDate[state.selectedDate] = [];
    state.tasksByDate[state.selectedDate].push({ id: makeId("todo"), title: title.slice(0, 50), completed: false });
    els.taskInput.value = "";
    els.taskForm.classList.remove("is-invalid");
    saveData();
    renderLinkedViews();
    showToast("已添加任务");
  });
  els.todoList.addEventListener("click", function (event) {
    var button = event.target.closest("[data-task-id]");
    if (button) toggleTask(state.selectedDate, button.dataset.taskId);
  });

  els.logoutButton.addEventListener("click", openLogoutModal);
  els.cancelLogout.addEventListener("click", closeLogoutModal);
  els.confirmLogout.addEventListener("click", function () { closeLogoutModal(); showToast("已模拟退出登录"); });
  els.logoutModal.addEventListener("click", function (event) { if (event.target.matches("[data-close-modal]")) closeLogoutModal(); });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeLogoutModal(); });
  window.addEventListener("hashchange", applyRoute);

  loadSavedData();
  if (!window.location.hash) window.location.hash = "#home";
  else applyRoute();
}());
