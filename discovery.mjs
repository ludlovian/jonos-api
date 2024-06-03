import dgram from 'node:dgram'

let socket

const search = Buffer.from([
  'M-SEARCH * HTTP/1.1',
  'HOST: 239.255.255.250:1900',
  'MAN: ssdp:discover',
  'MX: 1',
  'ST: urn:schemas-upnp-org:device:ZonePlayer:1'
].join('\r\n'))

function send () {
  const addrs = ['239.255.255.250', '255.255.255.255']
  for (const addr of addrs) {
    socket.send(search, 0, search.length, 1900, addr)
  }
}

socket = dgram.createSocket('udp4')
socket.on('message', (buf, rinfo) => console.log(buf.toString('utf8'), rinfo))
  

socket.bind(() => {
  socket.setBroadcast(true)
  send()
})
