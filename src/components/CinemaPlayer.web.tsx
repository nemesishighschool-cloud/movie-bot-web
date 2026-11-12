import React from 'react';

export default function CinemaPlayer({url, title}:{url:string; title:string}) {
  return <iframe title={`Lecteur vidéo : ${title}`} src={url} sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen; encrypted-media" allowFullScreen referrerPolicy="no-referrer" style={{width:'100%',aspectRatio:'16 / 9',border:0,borderRadius:12,background:'#0b1424'}} />;
}
