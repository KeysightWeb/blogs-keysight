// eslint-disable no-console
const addForm = async (block) => {
  // hiding till ready to display
  const displayValue = block.style.display;
  block.style.display = 'none';

  // The block will have two rows: the form file name and the thank you string
  const formName = block.firstElementChild.innerText.trim();
  const thankYou = block.firstElementChild.nextElementSibling;
  // fetch the HTML from the /forms directory
  const data = await fetch(`${window.hlx.codeBasePath}/blocks/eloqua-form/forms/${formName}.html`);
  if (!data.ok) {
    /* eslint-disable-next-line no-console */
    console.error(`failed to load form: ${formName}`);
    block.innerHTML = '';
    return;
  }

  block.innerHTML = await data.text();

  // If 'Thank you' string is provided swap it for the form upon submission
  if (thankYou) {
    const form = block.querySelector('form');
    const oldSubmit = form.onsubmit;
    form.onsubmit = function handleSubmit() {
      if (oldSubmit.call(this)) {
        const body = new FormData(this);
        const { action, method } = this;
        fetch(action, { method, body, redirect: 'manual' }).then((resp) => {
          /* eslint-disable-next-line no-console */
          if (!resp.ok) console.error(`form submission failed: ${resp.status} / ${resp.statusText}`);
          const firstContent = thankYou.firstElementChild;
          if (firstContent.tagName === 'A') {
            // redirect to thank you page
            window.location.href = firstContent.href;
          } else {
            // show thank you content
            block.replaceChildren(thankYou);
          }
        });
      }
      return false;
    };
  }

  // Attach the forms stylesheets
  const styles = block.querySelectorAll('style');
  styles.forEach((styleSheet) => {
    document.head.appendChild(styleSheet);
  });

  // loading scripts one by one to prevent inappropriate script execution order.
  // eslint-disable-next-line no-restricted-syntax
  for (const script of [...block.querySelectorAll('script')]) {
    let waitForLoad = Promise.resolve();
    // the script element added by innerHTML is NOT executed
    // the workaround is to create the new script tag, copy attibutes and content
    const newScript = document.createElement('script');

    newScript.setAttribute('type', 'text/javascript');
    // coping all script attribute to the new one
    script.getAttributeNames().forEach((attrName) => {
      const attrValue = script.getAttribute(attrName);
      newScript.setAttribute(attrName, attrValue);

      if (attrName === 'src') {
        waitForLoad = new Promise((resolve) => {
          newScript.addEventListener('load', resolve);
        });
      }
    });
    newScript.innerHTML = script.innerHTML;
    script.remove();
    document.body.append(newScript);

    // eslint-disable-next-line no-await-in-loop
    await waitForLoad;
  }

  // adding class to the select parent element, so the select's arrow could be displayed.
  block.querySelectorAll('select').forEach((el) => {
    el.parentElement.classList.add('eloqua-select-wrapper');
  });

  block.style.display = displayValue;
};

export default async function decorate(block) {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      addForm(block);
    }
  }, {
    rootMargin: '300px',
  });
  observer.observe(block);
}
