const {desktopCapturer} = require('electron')
const fs = require('fs')
const MediaStreamRecorder = require('msr')

var streamRecorder
let desktopSharing = false
let localStream
var blobs = []

function refresh () {
  window.$('select').imagepicker({
    hide_select: true
  })
}

function addSource (source) {
  window.$('select').append(window.$('<option>', {
    value: source.id.replace(':', ''),
    text: source.name
  }))
  console.log(navigator.mediaDevices)
  window.$('select option[value="' + source.id.replace(":", "") + '"]').attr('data-img-src', source.thumbnail.toDataURL())
  refresh()
}

function showSources () {
  desktopCapturer.getSources({ types:['window', 'screen'] }, function(error, sources) {
    addSource(sources[1])
    // for (let source of sources) {
    //   console.log('Name: ' + source.name)
    //   addSource(source[1])
    // }
  })
}

function toggle () {
  // onAccessApproved()
  if (!desktopSharing) {
    var id = (window.$('select').val()).replace(/window|screen/g, function(match) { return match + ':' })
    onAccessApproved(id)
  } else {
    desktopSharing = false

    if (localStream) {
      localStream.getTracks()[0].stop()
    }
    streamRecorder.stop()
    localStream = null

    document.querySelector('button').innerHTML = 'Enable Capture'

    window.$('select').empty()
    showSources()
    refresh()
  }
}

function onAccessApproved (desktopId) {
  if (!desktopId) {
    console.log('Desktop Capture access rejected.')
    return
  }
  // console.log(desktopId)
  desktopSharing = true
  document.querySelector('button').innerHTML = 'Disable Capture'
  // console.log('Desktop sharing started.. desktopId:' + desktopId)
  navigator.webkitGetUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: desktopId,
        minWidth: 1280,
        maxWidth: 1280,
        minHeight: 720,
        maxHeight: 720
      }
    }
  }, gotStream, getUserMediaError)

  function gotStream (stream) {
    localStream = stream
    blobs = []
    streamRecorder = new window.MediaRecorder(stream)
    streamRecorder.ondataavailable = function (event) {
      blobs.push(event.data)
      stopRecording()
    }
    streamRecorder.start()
    // document.querySelector('video').src = URL.createObjectURL(stream)
    stream.onended = function () {
      if (desktopSharing) {
        toggle()
      }
    }
  }

  function getUserMediaError (e) {
    console.log('getUserMediaError: ' + JSON.stringify(e, null, '---'))
  }
}

function stopRecording () {
  toArrayBuffer(new Blob(blobs, {type: 'video/webm'}), function (ab) {
    var buffer = toBuffer(ab)
    var file = `./videos/example.webm`
    console.log(buffer)
    fs.writeFile(file, buffer, function (err) {
      if (err) {
        console.error('Failed to save video ' + err)
      } else {
        console.log('Saved video: ' + file)
      }
    })
  })
}
function toArrayBuffer (blob, cb) {
  let fileReader = new FileReader()
  fileReader.onload = function () {
    let arrayBuffer = this.result
    cb(arrayBuffer)
  }
  fileReader.readAsArrayBuffer(blob)
}

function toBuffer (ab) {
  let buffer = Buffer.alloc(ab.byteLength)
  let arr = new Uint8Array(ab)
  for (let i = 0; i < arr.byteLength; i++) {
    buffer[i] = arr[i]
  }
  return buffer
}

window.$(document).ready(function () {
  showSources()
  refresh()
})

document.querySelector('button').addEventListener('click', function (e) {
  toggle()
})
