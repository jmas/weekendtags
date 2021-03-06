var APP_URL = 'https://script.google.com/macros/s/AKfycbxp2m7CaTvKvZDp5WXdMHzP1uP2bS646sK1wX8y5idnZbtz0zg/exec';

function loadPlaces(search, page) {
  var page = page ? page : 1;
  renderPlaces(null, true);
  return jsonp(APP_URL, {
    action: 'get-places',
    search: search,
    page: page
  }).then(renderPlaces);
}

function loadTags() {
  return jsonp(APP_URL, {
    action: 'get-tags',
    limit: 10
  }).then(renderTags);
}

function getLikeText(count) {
  return `
  	<svg class="icon-element">
    	<use xlink:href="#icon-thumbup" class="icon-use" />
    </svg>
  	${count}
	`;
}

function geTagHtml(tag, likes, url) {
  return `
  	<span class="tag">
      <span
        data-url="${url ? url : ''}"
        data-tag="${tag}"
        data-button="1"
      >${tag}</span>${likes ? `<span data-url="${url ? url : ''}" data-tag="${tag}" data-like="1">
      	${getLikeText(likes)}</span>` : ''}
    </span>
  `;
}

function getPaginationHtml(page, total, limit) {
  var pagesCount = Math.ceil(total / limit);
  var links = [];
  for (var i = 0; i < pagesCount; i++) {
    links.push(`<span data-page="${i + 1}" ${page === i + 1 ? 'data-current' : ''}>${i + 1}</span>`);
  }
  return `<div class="pagination">${links.join('')}</div>`;
}

function renderTags(items) {
  var tags = document.getElementById('tags');
  tags.innerHTML = items.map(function (tag) {
    return geTagHtml(tag.name);
  }).join('');
  tags.onclick = function (event) {
    event.preventDefault();
    if (event.target.dataset.tag) {
      addSearchValue(event.target.dataset.tag, true);
      loadPlaces(getSearchValue());
    }
  };
}

function addSearchValue(value, replace) {
  var tagsInput = document.getElementById('search-form-input');
  tagsInput.value = (replace ? [] : tagsInput.value.split(',')).concat([value]).map(function (item) { return item.trim(); }).filter(function (item) { return Boolean(String(item)); }).join(' ');
}

function getSearchValue() {
  var tagsInput = document.getElementById('search-form-input');
  return tagsInput.value;
}

function getPhotosHtml(photos) {
  return `<ul class="photos">${photos.map(photo => `<li><a href="${photo}" target="_blank"><img src="${photo}"></a></li>`).join('')}</ul>`;  
}

function renderPlaces(response, loading) {
  var places = document.getElementById('places');
  if (loading) {
    places.textContent = 'Загрузка...';
    return;
  }
  var items = response.items;
  places.onclick = function (event) {
    if (event.target.dataset.like) {
      event.preventDefault();
      var prevContent = event.target.innerHTML;
      event.target.textContent = '...';
      jsonp(APP_URL, {
        action: 'add-like',
        url: event.target.dataset.url,
        tag: event.target.dataset.tag
      }).then(function (likes) {
        event.target.innerHTML = likes ? getLikeText(likes) : prevContent;
      });
    }
    if (event.target.dataset.page) {
      event.preventDefault();
      loadPlaces(null, event.target.dataset.page);
    }
    if (event.target.dataset.tag) {
      addSearchValue(event.target.dataset.tag, true);
      loadPlaces();
    }
  };
  places.innerHTML = items.length > 0 ? items.map(function (item) {
    return `
  		<div class="place">
      	<h2><a href="${item.url}" target="_blank">${item.place ? item.place.name : '(unnamed)'}</a></h2>
        ${Object.keys(item.tags).map(tag => geTagHtml(tag, item.tags[tag], item.url)).join('')}
        ${item.place && item.place.photos ? getPhotosHtml(item.place.photos) : ''}
      </div>
  	`;
  }).join('') : 'К сожалению, пока ничего нет';
  if (response.total > 10) {
    places.innerHTML += getPaginationHtml(
      response.page,
      response.total,
      response.limit
    );
  }
}

function initTags() {
  loadTags();
}

function initPlaces() {
  loadPlaces();
}

function initPlaceForm() {
  var sendBtn = document.getElementById('place-form-send-btn');
  var form = document.getElementById('place-form');
  var tags = document.getElementById('place-form-tags');
  tags.onclick = function (event) {
    event.preventDefault();
    if (event.target.dataset.tag) {
      var tagsInput = document.getElementById('tags-field');
      tagsInput.value = tagsInput.value.split(',').concat([event.target.dataset.tag]).map(function (item) { return item.trim(); }).filter(function (item) { return Boolean(String(item)); }).join(', ');
    }
  };
  form.onsubmit = function (event) {
    event.preventDefault();
    var data = Object.fromEntries(new FormData(event.target));
    data.action = 'add-place';
    sendBtn.disabled = true;
    jsonp(APP_URL, data).then(() => {
      form.reset();
      sendBtn.disabled = false;
      showMessage('add-place-message');
    });
  };
  jsonp(APP_URL, {
    action: 'get-tags'
  }).then(function (items) {
    tags.innerHTML = items.map(function (tag) {
      return geTagHtml(tag.name);
    }).join('');
  });
}

function showMessage(id, timeout) {
  var message = document.getElementById(id);
  message.style.display = 'block';
  setTimeout(() => {
    message.style.display = 'none';
  }, timeout ? timeout : 5000);
}

function initSearchForm() {
  var form = document.getElementById('search-form');
  form.onchange = function (event) {
    var data = Object.fromEntries(new FormData(form));
    loadPlaces(data.search);
  };
}

function initLinks() {
  document.body.onclick = function (event) {
    if (event.target.tagName.toLowerCase() === 'a') {
      var href = event.target.getAttribute('href');
      if (href === '#places-page') {
        event.preventDefault();
        showPage(href.substring(1));
        addSearchValue('', true);
        loadPlaces();
      } else if (href[0] === '#') {
        event.preventDefault();
        showPage(href.substring(1));
      }
    }
  };
}

function initTagsList() {
  var tagsList = document.getElementById('tags-list');
  tagsList.onclick = function (event) {
    event.preventDefault();
    if (event.target.dataset.tag) {
      addSearchValue(event.target.dataset.tag, true);
      loadPlaces(getSearchValue());
      showPage('places-page');
    }
  };
  jsonp(APP_URL, {
    action: 'get-tags',
    limit: 100
  }).then(function (items) {
    tagsList.innerHTML = items.map(function (tag) {
      return geTagHtml(tag.name, tag.likes);
    }).join('');
  });
}

function showPage(id) {
  [
    'tags-page',
    'add-place-page',
    'places-page'
  ].forEach(function (pageId) {
    document.getElementById(pageId).style.display = id === pageId ? '' : 'none';
  });
}

function run() {
  initPlaces();
  initTags();
  initPlaceForm();
  initSearchForm();
  initLinks();
  initTagsList();
}

function jsonp(url, data) {
  return new Promise(function (resolve, reject) {
    var script = document.createElement('script');
    var id = '__jsonp_' + new Date().getTime() + '_' + Math.ceil(Math.random() * 1000);
    function cleanup() {
      delete window[id];
      document.body.removeChild(script);
    }
    window[id] = function (data) {
      resolve(data);
      cleanup();
    };
    script.onerror = function () {
      reject();
      cleanup();
    };
    script.src = url + '?jsonp=' + id + (data ? '&data=' + encodeURIComponent(JSON.stringify(data)) : '');
    document.body.appendChild(script);
  });
}

run();
