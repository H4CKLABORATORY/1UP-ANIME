/* Ficha del primer episodio en canal oficial de TMS.
   Solo iframe YouTube oficial; sin proxy, descarga ni DRM. */
(()=>{'use strict';
const ID='mal-27947',VIDEO='K8LrLO_omys';
const anime={id:ID,mal_id:27947,title:'LUPIN THE 3rd PART 4',
 description:'Lupin III regresa con aventuras en Italia y San Marino. Un episodio completo está publicado por el canal oficial de TMS Entertainment.',
 image:'',banner:'',averageScore:0,year:2015,genres:['Action','Adventure','Comedy'],
 format:'TV',episodes:26,status:'FINISHED',siteUrl:'https://www.tms-e.co.jp/global/alltitles/lupin/010501.html',
 streaming:[{name:'TMS — YouTube oficial',url:'https://www.youtube.com/watch?v='+VIDEO}],source:'tms-official-public-embed'};
function mount(){
 window.OneUpCatalog?.register?.([anime]);
 document.getElementById('oneup-official-episode-open')?.addEventListener('click',()=>window.OneUpCatalog?.open?.(ID));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();