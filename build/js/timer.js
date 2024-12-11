$(function(){
	 if($('#tmp_wrapper').length){
		//現在の時間を取得する
		let hour = new Date().getHours();
		let element = $('#tmp_wrapper');
		//■朝5時〜9時59分まで
		if(hour >= 5　&& hour < 10){
			element.addClass('morning');
		//■昼10時〜15時59分まで
		}else if(hour >=10 && hour <16){
			element.addClass('noon');
		//■夕方16時〜17時59分まで
		}else if(hour >=16 && hour <18){
			element.addClass('evening');
		//■夜18時〜19時59分まで
		}else if(hour >=18 && hour <20){
			element.addClass('evening2');
		//■夜20時〜4時59分まで
		}else if((hour >=20 && hour <23) || (hour >=0 && hour <5)){
			element.addClass('night');
		}
	}
});