function formula(element, value) {
 const source = document.createElement('code')
 source.textContent = value
 let hideSourceTimeout
 let sourceIsVisible = false
 function cancelHideSource() {
  clearTimeout(hideSourceTimeout)
 }
 source.addEventListener(
  'mouseover',
  cancelHideSource
 )
 function showSource() {
  cancelHideSource()
  insertAfter(element, source)
  sourceIsVisible = true
 }
 function hideSource() {
  hideSourceTimeout = setTimeout(
   hideSourceNow,
   5e2
  )
 }
 function hideSourceNow() {
  if (sourceIsVisible) {
   element.parentElement.removeChild(source)
   sourceIsVisible = false
  }
 }
 element.addEventListener(
  'mouseenter',
  showSource
 )
 element.addEventListener(
  'mouseleave',
  hideSource
 )
 element.classList.add('formula')
 element.classList.add('formula-pending')
 element.textContent = '···'

 sandbox(value.substring(1))
  .then((output) => {
   element.textContent = output
  })
  .catch((e) => {
   console.error(e)
   element.classList.add('formula-error')
   element.textContent = e.message
  })
  .finally(() => {
   element.classList.remove('formula-pending')
  })
}

const workerBlob = new Blob([
 `const MAX_OUTPUT_SIZE = 4096;
onmessage = (e) => {
 try {
  const result = String(eval(e.data));
  if (result.length > MAX_OUTPUT_SIZE) {
    throw new Error("Output exceeds size limit");  
  }
  postMessage('S' + result);
 } catch (err) {
  postMessage('E' + err.message);  
 }
}`,
])

function sandbox(code) {
 const MAX_INPUT_SIZE = 1024

 if (code.length > MAX_INPUT_SIZE) {
  throw new Error('Formula exceeds size limit')
 }

 return new Promise((resolve, reject) => {
  const worker = new Worker(
   URL.createObjectURL(workerBlob)
  )

  let workerTimeout
  const timeout = () => {
   worker.terminate()
   reject(new Error('Formula timed out'))
  }

  worker.onmessage = (e) => {
   clearTimeout(workerTimeout)
   if (e.data.startsWith('S')) {
    resolve(e.data.substring(1))
   } else {
    reject(new Error(e.data.substring(1)))
   }
  }

  worker.postMessage(code)
  workerTimeout = setTimeout(timeout, 5000)
 })
}
