<?php if($sm['user']['total_photos'] == 0 && !isset($_SESSION['skipUploadPhoto']) && $sm['plugins']['settings']['showUploadPhotoAfterRegister'] == 'Yes' || $sm['user']['total_photos'] == 0 &&  $sm['plugins']['settings']['forcePhotoUpload'] == 'Yes' && $sm['plugins']['settings']['showUploadPhotoAfterRegister'] == 'Yes'){ ?>
    

        <center>
            <img class="responsive-img" src="<?= $sm['theme']['logo']['val']; ?>" style="margin-bottom: 20px;padding-top: 20px" />
        </center>
    </div> 
<div class="simple-promo" style="background: none">
    <center>
    <div class="simple-promo__content" style="background: none">
      
        <div class="simple-promo__img">
                <div style="position:absolute;left:44%;width: 140px;height: 140px;background: none;z-index: 2;cursor: pointer;" onclick="upProfilePoto()"></div>            
            <div class="brick brick--xxlg"  style="background: none;cursor: pointer;" >

                <div class="brick-img profile-photo" data-upload-force data-force-profile-photo="1" data-src="<?= $sm['user']['profile_photo']; ?>" style="cursor: pointer;"></div>
                <div class="onboarding-tooltip" data-direction="right" style="left: 120px" >
                    <div class="onboarding-tooltip__inner">
                        <div class="onboarding-tooltip__text" contenteditable="true" data-force-profile-photo="5" style="outline: none"><?= $sm['user']['bio']; ?></div>
                    </div>
                </div>
                                     
            </div>

        </div>
        <div style="margin-top: 35px;">
            <h5 class="xxx-large b montserratRegular" data-force-profile-photo="2" style="font-weight: 700"><?= $sm['lang'][644]['text']; ?></h5>
            
        </div>          
        <p class="large" data-force-profile-photo="3" style="margin-top: 5px"><?= $sm['lang'][645]['text']; ?></p><br>
        <button class="button-circular box-shadow vivify popIn" onclick="upProfilePoto()" style="opacity: 1; transform: translateY(0px);background: #fff;right: 25px;top:55px;z-index: 9">
            <svg id="icon-camera-add" viewBox="0 0 32 32" width="60%" height="60%"><path d="M30 25h-2v-2h-1v2h-2v1h5v-1zm-2 3v-2h-1v2h1zm-.5 2a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM21 25.51c0 .89.18 1.73.5 2.5H5.04A3.08 3.08 0 0 1 2 24.9V10.1A3.08 3.08 0 0 1 5.04 7h4.31l2.72-3h7.86l2.7 2.99h4.34c1.68 0 3.04 1.4 3.04 3.12v9.4a6.5 6.5 0 0 0-9.01 6zM16.02 24A6.9 6.9 0 0 0 23 17c0-1.28-.31-2.45-.93-3.52A6.94 6.94 0 0 0 16.02 10 7.01 7.01 0 0 0 9 17a7.01 7.01 0 0 0 7.02 7zm2.8-4.17A3.85 3.85 0 0 0 20 17c0-1.1-.4-2.05-1.17-2.83A3.85 3.85 0 0 0 16 13c-1.1 0-2.05.4-2.83 1.17A3.85 3.85 0 0 0 12 17c0 1.1.4 2.05 1.17 2.83A3.85 3.85 0 0 0 16 21c1.1 0 2.05-.4 2.83-1.17z"></path></svg>
        </button>
        <br><br>
        <?php if($sm['plugins']['settings']['forcePhotoUpload'] == 'No'){ ?> 
            <p class="large" style="margin-top: 5px">
                <a href="#" onclick="skipUploadPhoto()"><?= $sm['lang'][888]['text']; ?></a>
            </p><br>
        <?php } ?>                    
</center></div>
</div> 
<?php } ?>