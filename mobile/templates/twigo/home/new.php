<ion-view title="" hide-nav-bar="true">
<div class="content-header-meet">
    <div class="content-header-messages-title">
        <h2 class="twigo-font">Upload Photo</h2>
    </div>
    <center><div class="loader02 hidden meet-loader" ng-if="loadingHeader"></div></center>
    



</div>
<ion-content delegate-handle="meetScroll" scroll="true" class="vivify fadeIn meet-content">
    <div class="page-content mt-115">
        <div class="twigo-meet-results pb-45">
            <div ng-show="!loading" ng-if="!noResult && meetAll">
                <div class="twigo-meet-card  vivify fadeInRightMeet delay-{{p.show*50}}" ng-repeat="p in meet track by $index" ng-if="p.blocked < 1" >
                    <div class="profile-photo " ng-click="openProfileModal({{p.id}},'{{p.name}}','{{p.photoBig}}',{{p.age}},'{{p.city}}',{{p.status}},{{p.allowed}},'online')" style="background-image: url({{p.photo}})"></div>
                    <div class="meet-user-name twigo-font font-w-500" >
                        {{p.name}} 
                        <div class="csms-online-status csms-online-status--online" ng-if="p.status == 1"></div>
                    </div>
                    <div class="meet-user-gender twigo-font twigo-gradient2" ng-if="p.gender == 2">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="37" height="16" viewBox="0 0 37 16">
                          <g clip-path="url(#clip-path)">
                            <text transform="translate(17 13)" fill="#fff" font-size="10" font-family="SegoeUI, Segoe UI" letter-spacing="0.009em"><tspan x="0" y="0">{{p.age}}</tspan></text>
                            <g id="woman" transform="translate(6 3)">
                              <rect id="Gender_woman_background" data-name="Gender/woman background" width="10" height="10" fill="none"/>
                              <path id="Oval_2" data-name="Oval 2" d="M2.857,10V9.285H1.428V7.857H2.857V7.071a3.571,3.571,0,1,1,1.429,0v.786H5.714V9.285H4.286V10ZM1.428,3.572A2.143,2.143,0,1,0,3.572,1.428,2.145,2.145,0,0,0,1.428,3.572Z" transform="translate(1.429)" fill="#fff"/>
                            </g>
                          </g>
                        </svg>
                    </div> 
                    <div class="meet-user-gender twigo-font twigo-gradient3" ng-if="p.gender == 1">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="37" height="16" viewBox="0 0 37 16">
                          <g clip-path="url(#clip-path)">
                            <text transform="translate(17 13)" fill="#fff" font-size="10" font-family="SegoeUI, Segoe UI" letter-spacing="0.009em"><tspan x="0" y="0">{{p.age}}</tspan></text>
                              <g id="woman" transform="translate(6 3)">
                                <rect id="Gender_man_background" data-name="Gender/man background" width="10" height="10" fill="none"/>
                                <path id="Oval_2" data-name="Oval 2" d="M2.786,11.286V7.056a3.571,3.571,0,1,1,1.542.006l-.008,4.259ZM1.428,3.572A2.143,2.143,0,1,0,3.572,1.428,2.145,2.145,0,0,0,1.428,3.572Z" transform="translate(3.99 11.061) rotate(-135)" fill="#fff"/>
                                <rect id="Rectangle_3" data-name="Rectangle 3" width="4.286" height="1.429" transform="translate(5.714)" fill="#fff"/>
                                <rect id="Rectangle_3-2" data-name="Rectangle 3" width="4.286" height="1.429" transform="translate(10) rotate(90)" fill="#fff"/>
                              </g>
                          </g>
                        </svg>
                    </div>                                                        

                    <i class="icon-svg icon-svg--stretch vivify popIn delay-700 meet-icon-fan" 
                    ng-if="p.fan == 1">
                        <svg viewBox="0 0 64 64" id="icon-floating-yes" width="20px" height="20px"><circle fill="#fff" cx="32" cy="32" r="32"></circle><path d="M18.5 29.7c0-4.25 3.43-7.7 7.65-7.7A7.67 7.67 0 0 1 32 24.73 7.67 7.67 0 0 1 37.85 22a7.68 7.68 0 0 1 7.65 7.7C45.5 36.57 36.46 45 32 45s-13.5-8.42-13.5-15.3z" fill="#ef5464"></path></svg>
                    </i> 

                    <i class="icon-svg icon-svg--stretch meet-icon-nofan" 
                    ng-if="p.fan == 0"  id="meetLike{{p.id}}">
                        <svg viewBox="0 0 64 64" id="icon-floating-yes" width="20px" height="20px"><circle fill="#fff" cx="32" cy="32" r="32"></circle><path d="M18.5 29.7c0-4.25 3.43-7.7 7.65-7.7A7.67 7.67 0 0 1 32 24.73 7.67 7.67 0 0 1 37.85 22a7.68 7.68 0 0 1 7.65 7.7C45.5 36.57 36.46 45 32 45s-13.5-8.42-13.5-15.3z" fill="#ef5464"></path></svg>
                    </i>
                    <div class="footer-gradient"></div>
                </div>
            </div>

            <div ng-if="meetSpotlight && !meetAll">
                <div class="twigo-meet-card" ng-click="openSpot()">
                    <div class="profile-photo" style="background-image: url({{me.profile_photo}})"></div>
                    <div class="wrapper-add-to-spotlight">
                        <div class="top-icon">
                            <img src="{{siteUrl}}mobile/twigo/img/add-spotlight.svg">
                        </div>
                        <div class="spotlight-text twigo-font">
                            {{alang[222].text}}
                        </div>
                        <div class="spotlight-activate twigo-gradient2 twigo-font">
                            {{alang[190].text}}
                        </div>                                
                    </div>
                </div>                        
                <div class="twigo-meet-card  vivify fadeInRightMeet delay-{{$index*50}}" ng-repeat="p in spotlight track by $index" >
                    <div class="profile-photo" ng-click="openProfileModal({{p.id}},'{{p.name}}','{{p.photoBig}}',{{p.age}},'{{p.city}}',{{p.status}})" style="background-image: url({{p.photo}})"></div>
                    <div class="meet-user-name twigo-font font-w-500">
                        {{p.name}} 
                        <div class="csms-online-status csms-online-status--online" ng-if="p.status == 1"></div>
                    </div>

                    <div class="meet-user-gender twigo-font twigo-gradient2" ng-if="p.gender == 2">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="37" height="16" viewBox="0 0 37 16">
                          <g clip-path="url(#clip-path)">
                            <text transform="translate(17 13)" fill="#fff" font-size="10" font-family="SegoeUI, Segoe UI" letter-spacing="0.009em"><tspan x="0" y="0">{{p.age}}</tspan></text>
                            <g id="woman" transform="translate(6 3)">
                              <rect id="Gender_woman_background" data-name="Gender/woman background" width="10" height="10" fill="none"/>
                              <path id="Oval_2" data-name="Oval 2" d="M2.857,10V9.285H1.428V7.857H2.857V7.071a3.571,3.571,0,1,1,1.429,0v.786H5.714V9.285H4.286V10ZM1.428,3.572A2.143,2.143,0,1,0,3.572,1.428,2.145,2.145,0,0,0,1.428,3.572Z" transform="translate(1.429)" fill="#fff"/>
                            </g>
                          </g>
                        </svg>
                    </div>

                    <div class="meet-user-gender twigo-font twigo-gradient3" ng-if="p.gender == 1">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="37" height="16" viewBox="0 0 37 16">
                          <g clip-path="url(#clip-path)">
                            <text transform="translate(17 13)" fill="#fff" font-size="10" font-family="SegoeUI, Segoe UI" letter-spacing="0.009em"><tspan x="0" y="0">{{p.age}}</tspan></text>
                              <g id="woman" transform="translate(6 3)">
                                <rect id="Gender_man_background" data-name="Gender/man background" width="10" height="10" fill="none"/>
                                <path id="Oval_2" data-name="Oval 2" d="M2.786,11.286V7.056a3.571,3.571,0,1,1,1.542.006l-.008,4.259ZM1.428,3.572A2.143,2.143,0,1,0,3.572,1.428,2.145,2.145,0,0,0,1.428,3.572Z" transform="translate(3.99 11.061) rotate(-135)" fill="#fff"/>
                                <rect id="Rectangle_3" data-name="Rectangle 3" width="4.286" height="1.429" transform="translate(5.714)" fill="#fff"/>
                                <rect id="Rectangle_3-2" data-name="Rectangle 3" width="4.286" height="1.429" transform="translate(10) rotate(90)" fill="#fff"/>
                              </g>
                          </g>
                        </svg>
                    </div>

                    <i class="icon-svg icon-svg--stretch vivify popIn delay-700 meet-icon-fan" 
                    ng-if="p.fan == 1">
                        <svg viewBox="0 0 64 64" id="icon-floating-yes" width="20px" height="20px"><circle fill="#fff" cx="32" cy="32" r="32"></circle><path d="M18.5 29.7c0-4.25 3.43-7.7 7.65-7.7A7.67 7.67 0 0 1 32 24.73 7.67 7.67 0 0 1 37.85 22a7.68 7.68 0 0 1 7.65 7.7C45.5 36.57 36.46 45 32 45s-13.5-8.42-13.5-15.3z" fill="#ef5464"></path></svg>
                    </i> 

                    <i class="icon-svg icon-svg--stretch meet-icon-nofan" 
                    ng-if="p.fan == 0"  id="meetLike{{p.id}}" >
                        <svg viewBox="0 0 64 64" id="icon-floating-yes" width="20px" height="20px"><circle fill="#fff" cx="32" cy="32" r="32"></circle><path d="M18.5 29.7c0-4.25 3.43-7.7 7.65-7.7A7.67 7.67 0 0 1 32 24.73 7.67 7.67 0 0 1 37.85 22a7.68 7.68 0 0 1 7.65 7.7C45.5 36.57 36.46 45 32 45s-13.5-8.42-13.5-15.3z" fill="#ef5464"></path></svg>
                    </i>

                    <div class="footer-gradient"></div>
                </div>
            </div>                    

            <div ng-show="!loading" ng-if="meetPopular">
                <div class="twigo-meet-card  vivify fadeInRightMeet delay-{{p.show*50}}" ng-repeat="p in populars track by $index" ng-if="p.blocked < 1" >
                    <div class="profile-photo" ng-click="openProfileModal({{p.id}},'{{p.name}}','{{p.photoBig}}',{{p.age}},'{{p.city}}',{{p.status}},{{p.allowed}},'popular')" style="background-image: url({{p.photo}})"></div>
                    <div class="meet-user-name twigo-font font-w-500">
                        {{p.name}} 
                        <div class="csms-online-status csms-online-status--online" ng-if="p.status == 1"></div>
                    </div>

                    <div class="meet-user-gender twigo-font twigo-gradient2" ng-if="p.gender == 2">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="37" height="16" viewBox="0 0 37 16">
                          <g clip-path="url(#clip-path)">
                            <text transform="translate(17 13)" fill="#fff" font-size="10" font-family="SegoeUI, Segoe UI" letter-spacing="0.009em"><tspan x="0" y="0">{{p.age}}</tspan></text>
                            <g id="woman" transform="translate(6 3)">
                              <rect id="Gender_woman_background" data-name="Gender/woman background" width="10" height="10" fill="none"/>
                              <path id="Oval_2" data-name="Oval 2" d="M2.857,10V9.285H1.428V7.857H2.857V7.071a3.571,3.571,0,1,1,1.429,0v.786H5.714V9.285H4.286V10ZM1.428,3.572A2.143,2.143,0,1,0,3.572,1.428,2.145,2.145,0,0,0,1.428,3.572Z" transform="translate(1.429)" fill="#fff"/>
                            </g>
                          </g>
                        </svg>
                    </div> 

                    <div class="meet-user-gender twigo-font twigo-gradient3" ng-if="p.gender == 1">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="37" height="16" viewBox="0 0 37 16">
                          <g clip-path="url(#clip-path)">
                            <text transform="translate(17 13)" fill="#fff" font-size="10" font-family="SegoeUI, Segoe UI" letter-spacing="0.009em"><tspan x="0" y="0">{{p.age}}</tspan></text>
                              <g id="woman" transform="translate(6 3)">
                                <rect id="Gender_man_background" data-name="Gender/man background" width="10" height="10" fill="none"/>
                                <path id="Oval_2" data-name="Oval 2" d="M2.786,11.286V7.056a3.571,3.571,0,1,1,1.542.006l-.008,4.259ZM1.428,3.572A2.143,2.143,0,1,0,3.572,1.428,2.145,2.145,0,0,0,1.428,3.572Z" transform="translate(3.99 11.061) rotate(-135)" fill="#fff"/>
                                <rect id="Rectangle_3" data-name="Rectangle 3" width="4.286" height="1.429" transform="translate(5.714)" fill="#fff"/>
                                <rect id="Rectangle_3-2" data-name="Rectangle 3" width="4.286" height="1.429" transform="translate(10) rotate(90)" fill="#fff"/>
                              </g>
                          </g>
                        </svg>
                    </div>                                                        


                    <i class="icon-svg icon-svg--stretch vivify popIn delay-700 meet-icon-fan" 
                    ng-if="p.fan == 1">
                        <svg viewBox="0 0 64 64" id="icon-floating-yes" width="20px" height="20px"><circle fill="#fff" cx="32" cy="32" r="32"></circle><path d="M18.5 29.7c0-4.25 3.43-7.7 7.65-7.7A7.67 7.67 0 0 1 32 24.73 7.67 7.67 0 0 1 37.85 22a7.68 7.68 0 0 1 7.65 7.7C45.5 36.57 36.46 45 32 45s-13.5-8.42-13.5-15.3z" fill="#ef5464"></path></svg>
                    </i> 

                    <i class="icon-svg icon-svg--stretch meet-icon-nofan" 
                    ng-if="p.fan == 0"  id="meetLike{{p.id}}" >
                        <svg viewBox="0 0 64 64" id="icon-floating-yes" width="20px" height="20px"><circle fill="#fff" cx="32" cy="32" r="32"></circle><path d="M18.5 29.7c0-4.25 3.43-7.7 7.65-7.7A7.67 7.67 0 0 1 32 24.73 7.67 7.67 0 0 1 37.85 22a7.68 7.68 0 0 1 7.65 7.7C45.5 36.57 36.46 45 32 45s-13.5-8.42-13.5-15.3z" fill="#ef5464"></path></svg>
                    </i>

                    <div class="footer-gradient"></div>
                </div>
            </div>
        </div>
        <div class="users-folder users-folder--chess" ng-if="noResult">
            <div class="users-folder__list">
                <div class="encounters-disabled expand-filter"  >
                    <div class="encounters-message meet-no-result">
                        <div class="brick  brick--xxlg vivify meet-no-result-brick" >
                            <div class="brick-img profile-photo box-shadow-credits" 
                            style="background-image: url('{{siteUrl}}mobile/twigo/img/no-result.png');"></div>
                        </div>
                        <h1 class="comforta">
                            {{alang[162].text}}
                        </h1>
                        <span>{{alang[163].text}}.<br>
                        {{alang[164].text}}?</span>
                        <div class="button-wrapper zIndex99">
                            <button class="button meet-no-result-btn" ng-click="goTo('home.settings','left');">
                                <div class="button__content"><span class="button__text comforta">{{alang[165].text}}</span></div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="people-nearby-banner mt-50px" ng-if="!noResult && meetAll" ng-show="showRiseUp">
        <div class="cta-box">
            <div class="cta-box__content">
                <div class="brick-group brick-group--promo">
                    <div class="brick brick--sm vivify popInBottom delay-100" >
                        <div class="brick__image" style="background-image: url('img/gata0.jpg')"></div>
                    </div>
                    <div class="brick vivify popInBottom delay-100">
                        <div class="brick__image" style="background-image: url('{{me.profile_photo}}')"></div>
                    </div>
                    <div class="brick brick--sm vivify popInBottom delay-100">
                        <div class="brick__image" style="background-image: url('img/gata1.jpg')"></div>
                    </div>
                </div>
            </div>
            <div class="cta-box__content vivify fadeIn delay-100">{{alang[198].text}}<b> {{me.city}}</b>.</div>
            <div class="cta-box__buttons vivify fadeIn delay-200">
                <div class="button-wrapper">
                    <button class="button button--riseup  twigo-gradient2" ng-click="openModalBoost(1)">
                        <div class="button__content">
                            <span class="button__text comforta fc-fff">{{alang[199].text}}</span>
                        </div>
                    </button>
                </div>
            </div>
            <div class="cta-box__additional hidden"></div>
        </div>
    </div>
    <ion-infinite-scroll immediate-check="false" on-infinite="loadMore()" distance="5%">
    </ion-infinite-scroll>

    <div ng-show="loadMores.length == 0" vertical layout center flex >
        <div class="text-muted text-center l-h comforta mt-50px">
          {{alang[117].text}}
          <br>
          <a href="#" ui-sref="home.settings" >{{alang[118].text}}</a>
        </div>
    </div>

    <div class="wrapper-reward modal-spotlight" ng-if="showSpot" >
        <div class="modal-reward modal--congratulations twigo-gradient2 vivify fadeIn border-radius-10">
            <div class="modal-reward-top boostSpotlight bg-none">
                <div class="klose animated fadeInUp bg-333" ng-click="cancelSpot()" >
                    <i class="icon ion-close-round close-modal-boost"></i>
                </div>
                <img class="modal-reward-icon u-imgResponsive animated fadeInUp rounded profileP modal-user-photo" style="background-image:url({{me.profile_photo}});">
                <div class="modal-reward-header animated fadeInUp">{{alang[119].text}}</div>
                <div class="modal-reward-subheader animated fadeInUp comforta font-s-12">{{alang[120].text}}<br>{{alang[121].text}} <strong>{{spot_price}}</strong> {{alang[48].text}}</div>
            </div>
            <div class="modal-reward-bottom bg-none" ng-click="addToSpotBtn();cancelSpot();">
                <button class="modal-reward-btn u-btn u-btn--danger comforta btn-add-to-stop" >{{alang[122].text}}</button>
            </div>
        </div>
    </div>

</ion-content>




</ion-view>
  