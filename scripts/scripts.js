import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  getMetadata,
  waitForLCP,
  loadBlocks,
  loadCSS,
  getMetadata,
} from './lib-franklin.js';

const LCP_BLOCKS = ['hero']; // add your LCP blocks to the list
window.hlx.RUM_GENERATION = 'project-1'; // add your RUM generation information here
window.keysight = window.keysight || {};
window.keysight.pages = window.keysight.pages || [];
window.keysight.delayed = window.keysight.delayed || [];
window.keysight.delayedReached = false;

/**
 * Create an element with the given id and classes.
 * @param {string} tagName the tag
 * @param {string} id the id
 * @param {string[]|string} classes the class or classes to add
 * @returns the element
 */
export function createElement(tagName, id, classes) {
  const elem = document.createElement(tagName);
  if (id) {
    elem.id = id;
  }
  if (classes) {
    const classesArr = (typeof classes === 'string') ? [classes] : classes;
    elem.classList.add(...classesArr);
  }

  return elem;
}

/**
 * Wraps images followed by links within a matching <a> tag.
 * @param {Element} container The container element
 */
export function wrapImgsInLinks(container) {
  const pictures = container.querySelectorAll('p picture');
  pictures.forEach((pic) => {
    const parent = pic.parentNode;
    const link = parent.nextElementSibling.querySelector('a');
    if (link && link.textContent.includes(link.getAttribute('href'))) {
      link.parentElement.remove();
      link.innerHTML = pic.outerHTML;
      parent.replaceWith(link);
    }
  });
}

/**
 * Get the list of pages from the query index
 */
export async function getPages() {
  if (window.keysight.pages === undefined || window.keysight.pages.length === 0) {
    const resp = await fetch('/query-index.json');
    const json = await resp.json();
    window.keysight.pages = json.data;
  }
  return window.keysight.pages;
}

function sortRelatedPosts(postA, postB) {
  let postAScore = 0;
  let postBScore = 0;

  // score based on match for tags/topic/subtopic
  // 1 point for each match on topic/subtopic/tag
  const topic = getMetadata('topic');
  const postATopic = postA.topic;
  const postBTopic = postB.topic;
  postAScore += (topic === postATopic) ? 1 : 0;
  postBScore += (topic === postBTopic) ? 1 : 0;

  const subtopic = getMetadata('subtopic');
  const postASubtopic = postA.subtopic;
  const postBSubtopic = postB.subtopic;
  postAScore += (topic === postATopic && subtopic === postASubtopic) ? 1 : 0;
  postBScore += (topic === postBTopic && subtopic === postBSubtopic) ? 1 : 0;

  const tags = getMetadata('tags');
  if (tags) {
    const postATags = postA.tags;
    if (postATags) {
      const commonTags = tags.split(',').filter((tag) => postATags.split(',').includes(tag));
      postAScore += commonTags.length;
    }

    const postBTags = postB.tags;
    if (postBTags) {
      const commonTags = tags.split(',').filter((tag) => postBTags.split(',').includes(tag));
      postBScore += commonTags.length;
    }
  }

  // calc result
  const result = postBScore - postAScore;
  if (result === 0) {
    // if they have the same score, sort by date
    const aDate = Number(postA.date);
    const bDate = Number(postB.date);
    return bDate - aDate;
  }

  return result;
}

/**
 * Get the list of blog posts from the query index. Posts are auto-filtered based on page context
 * e.g topic, sub-topic, tags, etc. and sorted by date
 *
 * @param {string} filter the name of the filter to apply
 * one of: topic, subtopic, author, tag, post, auto, none
 * @param {number} limit the number of posts to return, or -1 for no limit
 * @returns the posts as an array
 */
export async function getPosts(filter, limit) {
  const pages = await getPages();
  // filter out anything that isn't a blog post (eg. must have an author)
  let finalPosts;
  const allPosts = pages.filter((page) => page.author !== undefined && page.author !== '');
  const topic = getMetadata('topic');
  const subTopic = getMetadata('subtopic');
  const url = new URL(window.location);
  const params = url.searchParams;
  const tag = params.get('tag');
  const template = getMetadata('template');
  let applicableFilter = filter ? filter.toLowerCase() : 'none';
  if (applicableFilter === 'auto') {
    if (tag) {
      applicableFilter = 'tag';
    } else if (template === 'author') {
      applicableFilter = 'author';
    } else if (topic && subTopic) {
      applicableFilter = 'subtopic';
    } else if (topic) {
      applicableFilter = 'topic';
    } else {
      applicableFilter = 'none';
    }
  }

  if (applicableFilter === 'post') {
    finalPosts = allPosts.sort(sortRelatedPosts);
  } else {
    finalPosts = allPosts.filter((post) => {
      let matches = true;
      if (applicableFilter === 'topic') {
        matches = topic === post.topic;
      }
      if (applicableFilter === 'subtopic') {
        matches = topic === post.topic && subTopic === post.subtopic;
      }
      if (applicableFilter === 'author') {
        // on author pages the author name is the title
        const author = getMetadata('title');
        matches = author === post.author;
      }
      if (applicableFilter === 'tag') {
        // used for the tag-matches page, where tag is passed in a query param
        const postTags = post.tags;
        if (tag && postTags) {
          matches = postTags.split(',').includes(tag);
        }
      }
      return matches;
    }).sort((a, b) => {
      const aDate = Number(a.date);
      const bDate = Number(b.date);
      return bDate - aDate;
    });
  }

  return limit < 0 ? finalPosts : finalPosts.slice(0, limit);
}

function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  const pictureParent = picture?.parentElement;
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = picture.closest('div');
    const elems = [picture];
    const h1Section = h1.closest('div');
    if (h1Section === section) {
      elems.push(h1);
      const desc = h1.parentElement.querySelector('h1 + p');
      if (desc) {
        elems.push(desc);
        const buttons = h1.parentElement.querySelector('h1 + p + .button-container');
        if (buttons) {
          elems.push(buttons);
        }
      } else {
        const buttons = h1.parentElement.querySelector('h1 + .button-container');
        if (buttons) {
          elems.push(buttons);
        }
      }
    }
    section.append(buildBlock('hero', { elems }));
    // picture was likely wrapped in a p that is now empty, so remove that
    if (pictureParent && pictureParent.tagName === 'P' && pictureParent.innerText.trim() === '') {
      pictureParent.remove();
    }
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

async function loadTemplate(doc, templateName) {
  try {
    const cssLoaded = new Promise((resolve) => {
      loadCSS(`${window.hlx.codeBasePath}/templates/${templateName}/${templateName}.css`, resolve);
    });
    const decorationComplete = new Promise((resolve) => {
      (async () => {
        try {
          const mod = await import(`../templates/${templateName}/${templateName}.js`);
          if (mod.default) {
            await mod.default(doc);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(`failed to load module for ${templateName}`, error);
        }
        resolve();
      })();
    });
    await Promise.all([cssLoaded, decorationComplete]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`failed to load block ${templateName}`, error);
  }
}

/**
 * loads everything needed to get to LCP.
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const templateName = getMetadata('template');
  loadTemplate(doc, templateName);
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    await waitForLCP(LCP_BLOCKS);
  }
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
export function addFavIcon(href) {
  const link = createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = href;
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

/**
 * loads everything that doesn't need to be delayed.
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? main.querySelector(hash) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/fonts/fonts.css`);
  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  addFavIcon(`${window.hlx.codeBasePath}/icons/favicon.ico`);
  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * loads everything that happens a lot later, without impacting
 * the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => {
    import('./delayed.js');
    // execute any delayed functions
    window.keysight.delayedReached = true;
    window.keysight.delayed.forEach((func) => func());
  }, 3000);
  // load anything that can be postponed to the latest here
}

/**
 * Execute a function of a delayed basis.
 * @param {function} func the function to execute
 */
export function execDeferred(func) {
  if (window.keysight.delayedReached) {
    func();
  } else {
    window.keysight.delayed.push(func);
  }
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
