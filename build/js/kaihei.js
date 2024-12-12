$(function(){
	//■.accordion1の中のp要素がクリックされたら
	$('.accordion1 p.ac1 a').click(function(){
		$('.accordion1 p.ac1').next('div.inner').slideToggle();
		//■.ac_closeがあった場合。
		if($('.ac_close').length){ 
			let element = $('#menu');
			//■classを#menuに対して、変更したい。
			element.toggleClass('ac_close');
			//■#menuの中の文字を「閉じる」に書き換える。
			let yz = document.getElementById("menu");
			yz.innerHTML = yz.innerHTML.replace("メニュー","閉じる");
		}else{
			let element = $('#menu');
			//■classを#menuに対して、変更したい。
			element.toggleClass('ac_close');
			//■#menuの中の文字を「メニュー」に書き換える。
			let yz2 = document.getElementById("menu");
			yz2.innerHTML = yz2.innerHTML.replace("閉じる","メニュー");
		}
	});
});