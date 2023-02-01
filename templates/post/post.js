import {
  getMetadata,
  decorateIcons,
  buildBlock,
  decorateBlock,
} from '../../scripts/lib-franklin.js';
import { createElement, getNavPages } from '../../scripts/scripts.js';

async function buildPostData(contentcontainer) {
  const pages = await getNavPages();
  const topic = getMetadata('subtopic') !== '' ? getMetadata('subtopic') : getMetadata('topic');
  let topicPath = '#';
  pages.forEach((page) => {
    if (page.topic === topic || page.subtopic === topic) {
      topicPath = page.path;
    }
  });
  const pubdate = getMetadata('publication-date');
  const readtime = getMetadata('read-time');
  contentcontainer.insertAdjacentHTML('afterbegin', `<p class='blog-category'><a href='${topicPath}'>${topic}</a></p>`);
  contentcontainer.querySelector('h1').insertAdjacentHTML('afterend', `<div class='post-stats'><span class='pubdate'>${pubdate}</span> | <span class="icon icon-clock"></span><span class='readtime'>${readtime}</span></div>`);
  decorateIcons(contentcontainer);
}

export default async function decorate(doc) {
  const contentcontainer = doc.querySelector('.hero-container') ? doc.querySelector('.hero-container').nextElementSibling.firstElementChild : doc.querySelector('main > .section');
  buildPostData(contentcontainer);

  const classes = ['section'];
  const sidebarSection = createElement('div', classes, {
    'data-section-status': 'initialized',
  });
  const sidebarContainer = createElement('div');
  sidebarSection.append(sidebarContainer);

  let sidebarPreviousSection;
  let sectionFound = false;
  const sections = [...doc.querySelectorAll('.section')];
  while (!sectionFound && sections.length > 0) {
    const section = sections.pop();
    if (!sidebarPreviousSection) {
      sidebarPreviousSection = section;
    } else if (section.classList.contains('related-content-container') || section.classList.contains('post-cards-container')) {
      sidebarPreviousSection = section;
    } else {
      sectionFound = true;
    }
  }
  const postSidebar = buildBlock('post-sidebar', '');
  sidebarContainer.append(postSidebar);
  sidebarPreviousSection.insertAdjacentElement('beforebegin', sidebarSection);
  decorateBlock(postSidebar);
}
