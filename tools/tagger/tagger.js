import { getAEMTagsHierarchy } from '../../blogs/scripts/taxonomy.js';
import { createElement } from '../sidekick/library/plugins/utils/utils.js';

function getChildTags(tag) {
  return Object.keys(tag)
    .filter((k) => !['tagName', 'tagTitle', 'tagPath'].includes(k))
    .map((k) => tag[k]);
}

function renderItems(items, ul, catId) {
  getChildTags(items)
    .forEach((item) => {
      const { tagName, tagTitle, tagPath } = item;
      const pathItem = createElement('li', '', {}, createElement('span', 'path'));

      const effectiveTitle = tagTitle || tagName || 'un-titled';
      const pathSpan = pathItem.querySelector('.path');
      const displayPath = tagPath
        .split('/')
        .slice(0, -1)
        .join('<span class="psep">/</span>')
        .concat('<span class="psep">/</span>');
      pathSpan.innerHTML = displayPath;
      const tagSpan = createElement('span', ['tag', `cat-${catId % 4}`], {
        'data-title': effectiveTitle,
        'data-name': tagName,
        'data-path': tagPath,
      }, effectiveTitle);

      pathSpan.append(tagSpan);
      ul.append(pathItem);
      renderItems(item, ul, catId);
    });
}

function getSelectedCategory() {
  const tagTypeSelect = document.querySelector('#tag-type');
  return tagTypeSelect.value;
}

async function getTaxonomy() {
  const category = getSelectedCategory();
  const aemTags = await getAEMTagsHierarchy(category, 'en');

  const finalTags = aemTags;
  return finalTags || {};
}

function filter() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  document.querySelectorAll('#results .tag').forEach((tag) => {
    const { title, path } = tag.dataset;
    const match = [title, path].find((val) => val.toLowerCase().indexOf(searchTerm) >= 0);
    if (match) {
      tag.closest('.path').classList.remove('filtered');
      const offset = title.toLowerCase().indexOf(searchTerm);
      if (offset >= 0) {
        const before = title.substring(0, offset);
        const term = title.substring(offset, offset + searchTerm.length);
        const after = title.substring(offset + searchTerm.length);
        tag.innerHTML = `${before}<span class="highlight">${term}</span>${after}`;
      } else {
        tag.textContent = tag.dataset.title;
      }
    } else {
      tag.closest('.path').classList.add('filtered');
      tag.textContent = tag.dataset.title;
    }
  });

  // unhide hidden parents if they have visible children
  document.querySelectorAll('#results .path.filtered').forEach((filteredTag) => {
    const unfilteredChild = filteredTag.querySelector('.path:not(.filtered)');
    if (unfilteredChild) {
      filteredTag.classList.remove('filtered');
    }
  });

  // hide categories with no visible results
  document.querySelectorAll('#results .category').forEach((category) => {
    const unfilteredChild = category.querySelector('.path:not(.filtered)');
    if (unfilteredChild) {
      category.classList.remove('filtered');
    } else {
      category.classList.add('filtered');
    }
  });

  const visibleCat = document.querySelector('#results .category:not(.filtered)');
  const noRes = document.querySelector('#no-results');
  if (!visibleCat) {
    noRes.style.display = 'block';
  } else {
    noRes.style.display = 'none';
  }
}
function toggleTag(target) {
  target.classList.toggle('selected');
  // eslint-disable-next-line no-use-before-define
  displaySelected();
}

function displaySelected() {
  const selEl = document.getElementById('selected');
  const selTagsEl = selEl.querySelector('.selected-tags');
  const toCopyBuffer = [];

  selTagsEl.innerHTML = '';
  const selectedTags = document.querySelectorAll('#results .path.selected');
  if (selectedTags.length > 0) {
    selectedTags.forEach((selectedPath) => {
      const clone = selectedPath.cloneNode(true);
      clone.classList.remove('selected', 'filtered');
      clone.addEventListener('click', () => {
        toggleTag(selectedPath);
      });

      const selectedTag = clone.querySelector('.tag');
      selectedTag.textContent = selectedTag.dataset.title;
      toCopyBuffer.push(selectedTag.dataset.path);
      selTagsEl.append(clone);
    });

    selEl.classList.remove('hidden');
  } else {
    selEl.classList.add('hidden');
  }

  const copybuffer = document.getElementById('copybuffer');
  copybuffer.value = toCopyBuffer.join(', ');

  const copyButton = document.querySelector('button.copy');
  copyButton.removeAttribute('disabled');
  copyButton.textContent = 'Copy';
}

async function initTaxonomy() {
  const taxonomy = await getTaxonomy();
  const results = document.getElementById('results');
  results.innerHTML = '';

  const renderCategories = (cats, namespace) => {
    const subCats = namespace.split('/');
    const displayNamespace = subCats.length > 1 ? subCats[0] : namespace;
    getChildTags(cats).forEach((cat, idx) => {
      const catElem = createElement('div', 'category', {}, createElement('h2', '', {}, `${displayNamespace}: ${cat.tagTitle || cat.tagName}`));
      const ul = createElement('ul');
      catElem.append(ul);
      renderItems(cat, ul, idx);
      results.append(catElem);
    });
  };

  const selectedNamespace = getSelectedCategory();
  if (selectedNamespace === '') {
    getChildTags(taxonomy)
      .forEach((namespace) => {
        renderCategories(namespace, namespace.tagTitle);
      });
  } else {
    renderCategories(taxonomy, selectedNamespace);
  }

  // hide empty categories
  results.querySelectorAll('.category').forEach((cat) => {
    const ul = cat.querySelector(':scope > ul');
    const items = ul.querySelector('li');
    if (!items) {
      cat.classList.add('empty');
    }
  });
  filter();
  displaySelected();
}

async function init() {
  const usp = new URLSearchParams(window.location.search);
  const tagType = usp.get('tagType');
  if (tagType) {
    const select = document.querySelector('#tag-type');
    const opt = select.querySelector(`option[value="${tagType}"]`);
    if (opt) {
      select.value = opt.value;
    }
  }
  await initTaxonomy();

  const selEl = document.getElementById('selected');
  const copyButton = selEl.querySelector('button.copy');
  copyButton.addEventListener('click', () => {
    const copyText = document.getElementById('copybuffer');
    navigator.clipboard.writeText(copyText.value);

    copyButton.textContent = 'Copied!';
    copyButton.disabled = true;
  });

  selEl.querySelector('button.clear').addEventListener('click', () => {
    const selectedTags = document.querySelectorAll('#results .path.selected');
    selectedTags.forEach((tag) => {
      toggleTag(tag);
    });
  });

  document.querySelector('#search').addEventListener('keyup', filter);
  document.querySelector('#tag-type').addEventListener('change', initTaxonomy);
  document.addEventListener('click', (e) => {
    const target = e.target.closest('.category .path');
    if (target) {
      toggleTag(target);
    }
  });
}

init();
