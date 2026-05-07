<?php 
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once(__DIR__ . '/../assets/includes/core.php'); ?>
<!DOCTYPE html>
<html>
  <head>
        <base href="/mobile/">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0, maximum-scale=1.0, target-densityDpi=device-dpi">
        <title></title>
    <link href="css/magic.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
    <link href="css/belloo20.css" rel="stylesheet">       
    <link href="css/belloo.css" rel="stylesheet">
    <link href="css/vivify.min.css" rel="stylesheet"> 
    <link href="css/i.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Montserrat" rel="stylesheet">
    <script>
        var site_url = '<?= $sm['config']['site_url']; ?>';
    var siteUrl = '<?= $sm['config']['site_url']; ?>';
        </script>
    <script src="lib/ionic/js/ionic.bundle.js"></script>
    <script src="lib/collide/collide.js"></script>
    <script src="lib/ionic-ion-tinder-cards/ionic.tdcards.js"></script>
    <script src="lib/angular-elastic/elastic.js"></script>
    <script src="js/giphy.js"></script>
    <script src="lib/ngCordova/dist/ng-cordova.js"></script>
        <script src="lib/gsap/src/uncompressed/TweenMax.js"></script>
        <script src="lib/ngFx/dist/ngFx.js"></script>
    <script src="lib/hammer/hammer.js"></script>
    <link rel="icon" type="image/png" href="<?= $sm['theme']['favicon']['val']; ?>" sizes="32x32">
    <script src="lib/angular-animate/angular-animate.js"/></script>
    <script src="https://angular-ui.github.io/ui-router/release/angular-ui-router.min.js"></script>    
    <link rel="stylesheet" href="lib/awlert/dist/css/awlert.css">
    <script src="lib/awlert/dist/js/awlert.min.js"></script>
        <script src="lib/ng-cordova-oauth/dist/ng-cordova-oauth.min.js"></script>
    <script src="https://js.pusher.com/4.0/pusher.min.js"></script>
    <link href="css/autocomplete.css" rel="stylesheet" type="text/css" />       
    <link rel="stylesheet" href="<?php echo $sm['config']['theme_url']; ?>/css/vendor/slim-lightbox.min.css">
    <link rel="stylesheet" type="text/css" href="<?php echo $sm['config']['theme_url']; ?>/css/vendor/little-widgets.css"/>        
    <link rel="stylesheet" href="../themes/default/css/crossplatform.css"/>
    <script>
        var nextStory = 0;
        var storyPage = '';
        var mobileSite = true;      
    </script>

        <script>
    var oneSignalID=-1,notificationOpenedCallback=function(e){},reg=0,c_quantity=0,lid=43,loader=0,p_quantity=0,ticky=!1,app,interval,c_price,reg_photo="",reg_username="",reg_lat="",reg_lng="",reg_city="",reg_country="",reg_thumb="",p_price,url,mobile=!1,chatLimit=!1,config="",peer,in_videocall=!1,site_prices,account_basic,account_premium,lang,tlang,alang,online=[],unread=[],usPhotos="",cu,regName,localStream,tlang,current_user,user="",show_chat_premium=1,game_array,user_info,current_user_id=0,user_name,meet_limit=0,meet_pages=0,spotlight=[],da=site_url,chats=[],f=da,matche=[],visitors=[],mylikes=[],superlikes=[],myfans=[],cards=[],gresult=[],chatUser,s_age,bottom=!1,s_radius,s_gender,onlineMeet=0,chatInterval,y=f,user_country,u=y,a=u,user_city,site_lang,site_config,totalDiscoverStories=0,storiesGlobal=[],goBackGlobal='';
        <?php 
        $user = array();
        if(isset($_GET['appId'])){
                echo 'oneSignalID = "'.$_GET['appId'].'";';
        } 
        if (isset($_SESSION['user']) && is_numeric($_SESSION['user']) && $_SESSION['user'] > 0) {   
            $user = $sm['user'];      
            echo 'oneSignalID = '.$_SESSION['user'].';';

        }
        $themeFilter = 'WHERE theme ="'.$sm['settings']['desktopTheme'].'" AND preset = "'.$sm['settings']['desktopThemePreset'].'"';
        $sm['theme'] = json_decode(getData('theme_preset','theme_settings',$themeFilter),true);        
        $site_plugins = json_encode($sm['plugins']); 
        $site_theme = json_encode($sm['theme']);
        $allG = count($sm['genders']);
        $account_basic = json_encode($sm['basic']);
        $user = json_encode($user);  
        $allG = $allG + 1;
        $pk = $sm['plugins']['pusher']['key'];
        echo '
            var allG = '.$allG.';
            user = '.$user.';  
            var plugins = '. $site_plugins  . ';
            var site_theme = '. $site_theme  . ';  
            var uploadStory = false;
            var user_name;  
            var current_user_id = 0;
            var account_basic = '. $account_basic  . ';
            var ph = 0;
            var upphotos = [];
            var extFilter = ["jpg", "jpeg", "png", "mp4", "ogg", "webm"];
            var storyAlbumFilter = ["video/3gpp", "video/mpeg", "video/mp4","video/webm","video/ogg"];            
        '; 
        echo '
        function request_source(){
            return \'' . $sm['config']['ajax_path'] . '\';
        }';
        ?>

        var gUrl = request_source()+'/rt.php';
        var aUrl = request_source()+'/api.php';  
        function inIframe () {
        try {
          return window.self !== window.top;
        } catch (e) {
          return true;
        }
        }

        var rt = '';
        var channel = '';
        if(inIframe() !== true){
            rt = new Pusher("<?= $pk; ?>", {
              encrypted: true,
              cluster: "<?=$sm['plugins']['pusher']['cluster']; ?>"
            });    
            channel = rt.subscribe("<?= $pk; ?>");
        } else {
            rt = new Pusher("<?= $pk; ?>", {
              encrypted: true,
              cluster: "<?=$sm['plugins']['pusher']['cluster']; ?>"
            });    
            channel = rt.subscribe("<?= $pk; ?>iframe");    
            console.log('iframe loaded no real time');
        }
    </script>
    <?php 
        $ip = $_SERVER['REMOTE_ADDR'];
        $ipstack = array('127.0.0.1', "::1");
        if(in_array($_SERVER['REMOTE_ADDR'], $ipstack)){
            $ip = '192.196.0.1';
        }
    ?>
    <?php
        // Validate mobileTheme — fall back if the template directory doesn't exist.
        // The DB may still have a stale value (e.g. "default") from a previous install.
        $resolvedMobileTheme = $sm['settings']['mobileTheme'] ?? 'mobile';
        $templateBase = __DIR__ . '/templates/';
        if (!is_dir($templateBase . $resolvedMobileTheme . '/home')) {
            // Find the first valid theme folder
            foreach (['mobile', 'twigo'] as $_fallback) {
                if (is_dir($templateBase . $_fallback . '/home')) {
                    $resolvedMobileTheme = $_fallback;
                    break;
                }
            }
            // Self-heal the DB so subsequent requests don't repeat the check cost
            if (isset($mysqli)) {
                $mysqli->query("UPDATE settings SET setting_val='" . $mysqli->real_escape_string($resolvedMobileTheme) . "' WHERE setting='mobileTheme'");
            }
        }
    ?>
    <script>
        var userIp = '<?= $ip; ?>';
        var upType = 0;
        var mobileTheme = '<?= htmlspecialchars($resolvedMobileTheme); ?>';
    </script>

    <script src="lib/adsense/ng-adsense.js"></script>    
    <script src="js/app.js"></script>
    <script src="js/controllers.js"></script>
    <script src="js/services.js"></script>
    <script src="js/directives.js"></script>
    <script src="js/peer.js"></script>
    <script src="js/resource.min.js"></script>
    <script src="lib/jquery/jquery.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ng-flow/2.5.1/ng-flow-standalone.min.js"></script>
        <script src="https://checkout.stripe.com/checkout.js"></script>
    <script src="https://connect.facebook.net/en_US/sdk.js"></script>    
    <script src="https://webrtc.github.io/adapter/adapter-latest.js"></script>
    <link href="https://fonts.googleapis.com/css?family=Rubik" rel="stylesheet" type="text/css"/>
    <style>
        .comforta{
            font-family: 'Rubik' !important;
        }
        .b-none{
            font-family: 'Rubik' !important;   
        }
        .csms-profile-info__name-inner{
            font-family: 'Rubik' !important;
        }
        .csms-p-1{
            font-family: 'Rubik' !important;
        }
        .chat-name{
            font-family: 'Rubik' !important;
        }        
        .text-muted{
            font-family: 'Rubik' !important;
        }  
        .item span{
            font-family: 'Rubik' !important;   
        }       
        .positive-bg{
            background: #000 !important;
        }
        .button.button--primary{
            background: #000!important;
            color: #fff!important;
        }
        .profile-info__title{
            font-family: 'Rubik' !important; 
        }
        .profile-info__content{
            font-family: 'Rubik' !important; 
        }
        .button.button--secundary.active{
            background: #00F9D1!important;
            color: #000!important;
        } 
        .black-text{
            color: #000!important;
        }         
        .selector__label{
            font-size: 16px;
        }
        .storyOn{
            border:3px solid <?= $sm['theme']['story_on']['val'];?>;
        }       
    </style>
  </head>
  <body ng-app="starter" ng-controller="AppCtrl" style="background: #fff;">
    <ion-nav-bar></ion-nav-bar>
    <ion-pane ui-view="">   
    </ion-pane>

    <div class="inapp-notification-wrapper chatNotification" style="z-index: 99999" ng-click="goTo('home.matches');hideNotification()">
        <div class="inapp-notification js-inapp-notification-touchable">
            <div class="inapp-notification__promo">
                <div class="inapp-notification__images">
                    <div class="inapp-notification__user chatNotificationPhoto" style="border-radius: 50%"></div>
                </div>
            </div>
            <div class="inapp-notification__content chatNotificationContent comforta"></div> 
        </div>
    </div>
    
    <div id="storytime" data-story="0"></div>
    <div class="preload-photos" style="display:none"></div>     
    <div id="upload-area" style="display: none">
        <input type='file' id="uploadContent" style="display: none" />    
    </div>
    <div id="upload-story" style="display: none" >
        <input type='file' id="uploadStoryContent">
    </div>    
  
    <script src="<?php echo $sm['config']['theme_url']; ?>/js/vendor/jquery.dm-uploader.min.js"></script>
    <?php foreach($sm['plugin'] as $plugin){ ?>
        <?php if(!empty($plugin['js_file'])){
    echo '<script src="'.$sm['config']['site_url'].'themes/plugins/'.$plugin['js_file'].'.js"></script>';
                } 
        } ?>
    <script>
    function locationUpdated(value){ 
        var lat = value.latitude;
        var lng = value.longitude;
        var city = value.name;
        var country = value.country;
        var message = '<?= $sm['user']['id']; ?>,'+lat+','+lng+','+city+','+country;   
        $.ajax({
            url: request_source()+'/api.php', 
            data: {
                action:"updateLocation",
                query: message                   
            },  
            type: "get",           
            success: function(response) {
                window.location.reload();                        
            },
        });             
    }
    </script>
    <script src="lib/hammer/jquery.hammer.js"></script>
    <script src="<?php echo $sm['config']['theme_url']; ?>/js/vendor/action-sheet.js"></script>    
    <script src="lib/autocomplete/autocomplete.js"></script>    
    <script src="<?php echo $sm['config']['theme_url']; ?>/js/vendor/slim-lightbox.min.js"></script>
    <script src="<?php echo $sm['config']['theme_url']; ?>/js/vendor/little-widgets.js"></script>    
    <script type="text/javascript">
        var currentStory;
        var socialStory = new Story({
            playlist: currentStory
        });          
    </script>
  </body>
</html>
