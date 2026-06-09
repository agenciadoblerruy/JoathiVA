<?php
/**
 * Help Panel.
 *
 * @package packers_agency
 */

$packers_agency_import_done = get_option( 'packers_agency_demo_import_done' );
$packers_agency_button_text = $packers_agency_import_done
	? __( 'View Site', 'packers-agency' )
	: __( 'Start Demo Import', 'packers-agency' );
$packers_agency_button_link = $packers_agency_import_done
	? home_url( '/' )
	: admin_url( 'themes.php?page=packersagency-wizard' );
?>
<div id="help-panel" class="panel-left visible">
    <div class="panel-aside active">
        <div class="demo-content">
            <div class="demo-info">
                <h4><?php esc_html_e( 'DEMO CONTENT IMPORTER', 'packers-agency' ); ?></h4>
                <p><?php esc_html_e('The Demo Content Importer helps you quickly set up your website to look exactly like the theme demo. Instead of building pages from scratch, you can import pre-designed layouts, pages, menus, images, and basic settings in just a few clicks.','packers-agency'); ?></p>
                <a class="button button-primary first-color" style="text-transform: capitalize" href="<?php echo esc_url( $packers_agency_button_link ); ?>" title="<?php echo esc_attr( $packers_agency_button_text ); ?>"
                    <?php echo $packers_agency_import_done ? 'target="_blank"' : ''; ?>>
                    <?php echo esc_html( $packers_agency_button_text ); ?>
                </a>
            </div>
            <div class="demo-img">
                <img src="<?php echo esc_url(get_stylesheet_directory_uri()) .'/screenshot.png'; ?>" alt="<?php echo esc_attr( 'screenshot', 'packers-agency'); ?>"/>
            </div>
        </div>
    </div>

    <div class="panel-aside" >
        <h4><?php esc_html_e( 'USEFUL LINKS', 'packers-agency' ); ?></h4>
        <p><?php esc_html_e( 'Find everything you need to set up, customize, and manage your website with ease. These helpful resources are designed to guide you at every step, from installation to advanced customization.', 'packers-agency' ); ?></p>
        <div class="useful-links">
            <a class="button button-primary second-color" href="<?php echo esc_url( PACKERS_AGENCY_DEMO_URL ); ?>" title="<?php esc_attr_e( 'Live Demo', 'packers-agency' ); ?>" target="_blank">
                <?php esc_html_e( 'Live Demo', 'packers-agency' ); ?>
            </a>
            <a class="button button-primary first-color" href="<?php echo esc_url( PACKERS_AGENCY_FREE_DOC_URL ); ?>" title="<?php esc_attr_e( 'Documentation', 'packers-agency' ); ?>" target="_blank">
                <?php esc_html_e( 'Documentation', 'packers-agency' ); ?>
            </a>
            <a class="button button-primary second-color" href="<?php echo esc_url( PACKERS_AGENCY_URL ); ?>" title="<?php esc_attr_e( 'Get Premium', 'packers-agency' ); ?>" target="_blank">
                <?php esc_html_e( 'Get Premium', 'packers-agency' ); ?>
            </a>
            <a class="button button-primary first-color" href="<?php echo esc_url( PACKERS_AGENCY_BUNDLE_URL ); ?>" title="<?php esc_attr_e( 'Get Bundle - 60+ Themes', 'packers-agency' ); ?>" target="_blank">
                <?php esc_html_e( 'Get Bundle - 60+ Themes', 'packers-agency' ); ?>
            </a>
        </div>
    </div>

    <div class="panel-aside" >
        <h4><?php esc_html_e( 'REVIEW', 'packers-agency' ); ?></h4>
        <p><?php esc_html_e( 'If you have a moment, please consider leaving a rating and short review. It only takes a minute, and your support means a lot to us.', 'packers-agency' ); ?></p>
        <a class="button button-primary first-color" href="<?php echo esc_url( PACKERS_AGENCY_REVIEW_URL ); ?>" title="<?php esc_attr_e( 'Visit the Review', 'packers-agency' ); ?>" target="_blank">
            <?php esc_html_e( 'Leave a Review', 'packers-agency' ); ?>
        </a>
    </div>
    
    <div class="panel-aside">
        <h4><?php esc_html_e( 'CONTACT SUPPORT', 'packers-agency' ); ?></h4>
        <p>
            <?php esc_html_e( 'Thank you for choosing Packers Agency! We appreciate your interest in our theme and are here to assist you with any support you may need.', 'packers-agency' ); ?></p>
        <a class="button button-primary first-color" href="<?php echo esc_url( PACKERS_AGENCY_SUPPORT_URL ); ?>" title="<?php esc_attr_e( 'Visit the Support', 'packers-agency' ); ?>" target="_blank">
            <?php esc_html_e( 'Contact Support', 'packers-agency' ); ?>
        </a>
    </div>
</div>