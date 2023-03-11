import { createElement } from '../../scripts/scripts.js';
import { createOptimizedPicture, getMetadata } from '../../scripts/lib-franklin.js';

/**
 * decorates the block
 * @param {Element} block The featured posts block element
 */
export default async function decorate(block) {
  const postsGrid = block.querySelector('div');
  postsGrid.classList.add('featured-posts-grid');

  [...postsGrid.children].forEach((post) => {
    post.classList.add('post', 'post-placeholder');

    const heading = post.querySelector('p > strong');
    const link = post.querySelector('p > a');

    post.innerHTML = `
        <a href="${link.href}"><div class="picture-placeholder"></div></a>
        <div>
          <p class="category">${heading.textContent}</p>
          <a href="${link.href}"></a>
        </div>
    `;

    if (link.title !== 'auto') {
      fetch(`${link.href}.plain.html`).then((resp) => {
        if (resp.ok) {
          resp.text().then((html) => {
            const temp = createElement('div');
            temp.innerHTML = html;
            const image = temp.querySelector('img');
            const title = temp.querySelector('h1');
            if (image) {
              const pic = createOptimizedPicture(image.src, '', false, [{ width: '200' }]);
              post.querySelector('.picture-placeholder').replaceWith(pic);
            }
            post.querySelector(':scope > div > a').textContent = title.textContent;
            post.classList.remove('post-placeholder');
          });
        }
      });
    } else {
      fetch('/blogs/query-index.json?limit=500').then((resp) => {
        if (resp.ok) {
          resp.json().then((json) => {
            const topic = getMetadata('topic');
            const subTopic = getMetadata('subtopic');
            const mostRecentPost = json.data.find((postData) => {
              if (!topic) {
                // no topic so just get the first one
                return true;
              }

              if (topic === postData.topic) {
                if (subTopic) {
                  return subTopic === postData.subTopic;
                }
                // topic match but no subtopic
                return true;
              }
              return false;
            });
            if (mostRecentPost) {
              const pic = createOptimizedPicture(mostRecentPost.image, '', false, [{ width: '200' }]);
              post.innerHTML = `
              <a href="${mostRecentPost.path}" title="${mostRecentPost.title.replaceAll('"', '')}">${pic.outerHTML}</a>
              <div>
                <p class="category">${heading.textContent}</p>
                <a href="${mostRecentPost.path}">${mostRecentPost.title}</a>
              </div>`;
              post.classList.remove('post-placeholder');
            } else {
              post.remove();
            }
          });
        }
      });
    }
  });
}
