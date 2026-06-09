<?php
/**
 * The template for displaying the footer.
 *
 * Contains the closing of the #content div and all content after.
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package packers_agency
 */
$packers_agency_scroll_top  = get_theme_mod( 'packers_agency_scroll_to_top', true );
$packers_agency_footer_background = get_theme_mod('packers_agency_footer_background_image');
$packers_agency_footer_background_url = '';
if(!empty($packers_agency_footer_background)){
    $packers_agency_footer_background = absint($packers_agency_footer_background);
    $packers_agency_footer_background_url = wp_get_attachment_url($packers_agency_footer_background);
}

$packers_agency_footer_background_color = get_theme_mod('packers_agency_footer_background_color', 'var(--primary-color)'); // New line

$packers_agency_footer_background_style = '';
if (!empty($packers_agency_footer_background_url)) {
    $packers_agency_footer_background_style = ' style="background-image: url(\'' . esc_url($packers_agency_footer_background_url) . '\'); background-repeat: no-repeat; background-size: cover;"';
} else {
    $packers_agency_footer_background_style = ' style="background-color: ' . esc_attr($packers_agency_footer_background_color) . ';"'; // Updated line
}
?>

</div>
</div>
</div>
</div>

<footer class="site-footer" <?php echo $packers_agency_footer_background_style; ?>>
    <?php 
    $packers_agency_active_areas = get_theme_mod('packers_agency_footer_widget_areas', 4);
    if (
        is_active_sidebar('footer-1') ||
        is_active_sidebar('footer-2') ||
        is_active_sidebar('footer-3') ||
        is_active_sidebar('footer-4')
    ) : ?>
        <div class="footer-t">
            <div class="container">
                <div class="row wow bounceInUp center delay-1000" data-wow-duration="2s">
                    <?php 
                    for ($packers_agency_i = 1; $packers_agency_i <= $packers_agency_active_areas; $packers_agency_i++) {

                        if (is_active_sidebar('footer-' . $packers_agency_i)) {

                            $packers_agency_col = 12 / $packers_agency_active_areas;

                            echo '<div class="col-xl-' . $packers_agency_col . ' col-lg-' . $packers_agency_col . ' col-md-6 col-sm-6">';
                            dynamic_sidebar('footer-' . $packers_agency_i);
                            echo '</div>';
                        }
                    }
                    ?>
                </div>
            </div>
        </div>

    <?php else : ?>

        <div class="footer-t footer-corporate">
            <div class="container">
                <div class="row g-4">
                    <div class="col-lg-5 col-md-6">
                        <div class="footer-brand-card">
                            <h2><?php bloginfo('name'); ?></h2>
                            <p><?php echo esc_html( get_bloginfo( 'description' ) ); ?></p>
                            <a class="joathi-btn joathi-btn-secondary" href="<?php echo esc_url( home_url( '/v/' ) ); ?>">
                                <?php esc_html_e( 'Ingresar a JoathiVA', 'packers-agency' ); ?>
                            </a>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="footer-link-card">
                            <h3><?php esc_html_e( 'Sitio', 'packers-agency' ); ?></h3>
                            <ul>
                                <li><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Inicio', 'packers-agency' ); ?></a></li>
                                <li><a href="<?php echo esc_url( home_url( '/#servicios' ) ); ?>"><?php esc_html_e( 'Servicios', 'packers-agency' ); ?></a></li>
                                <li><a href="<?php echo esc_url( home_url( '/#operativa' ) ); ?>"><?php esc_html_e( 'Operativa', 'packers-agency' ); ?></a></li>
                                <li><a href="<?php echo esc_url( home_url( '/#contacto' ) ); ?>"><?php esc_html_e( 'Contacto', 'packers-agency' ); ?></a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="col-lg-4 col-md-12">
                        <div class="footer-link-card">
                            <h3><?php esc_html_e( 'Operación', 'packers-agency' ); ?></h3>
                            <p><?php esc_html_e( 'Seguimiento comercial, documentación y control operativo con acceso directo al asistente JoathiVA.', 'packers-agency' ); ?></p>
                            <p class="footer-mini-note"><?php esc_html_e( 'Marca visual: verde, amarillo y blanco.', 'packers-agency' ); ?></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    <?php endif; ?>

    <?php do_action('packers_agency_footer'); ?>

    <?php if ( get_theme_mod('packers_agency_enable_footer_icon_section', true) ) : ?>
        <div class="footer-social-icons text-center">
            <div class="container">
                <?php if ( get_theme_mod('packers_agency_footer_facebook_link', 'https://www.facebook.com/') != '' && get_theme_mod('packers_agency_footer_facebook_link', 'https://www.facebook.com/') !== 'https://www.facebook.com/' ) { ?>
                    <a target="_blank" href="<?php echo esc_url(get_theme_mod('packers_agency_footer_facebook_link', 'https://www.facebook.com/')); ?>">
                        <i class="<?php echo esc_attr(get_theme_mod('packers_agency_facebook_icon', 'fa-brands fa-facebook')); ?>"></i>
                        <span class="screen-reader-text"><?php esc_html_e('Facebook', 'packers-agency'); ?></span>
                    </a>
                <?php } ?>
                <?php if ( get_theme_mod('packers_agency_footer_twitter_link', 'https://twitter.com/') != '' && get_theme_mod('packers_agency_footer_twitter_link', 'https://twitter.com/') !== 'https://twitter.com/' ) { ?>
                    <a target="_blank" href="<?php echo esc_url(get_theme_mod('packers_agency_footer_twitter_link', 'https://x.com/')); ?>">
                        <i class="<?php echo esc_attr(get_theme_mod('packers_agency_twitter_icon', 'fa-brands fa-twitter')); ?>"></i>
                        <span class="screen-reader-text"><?php esc_html_e('Twitter', 'packers-agency'); ?></span>
                    </a>
                <?php } ?>
                <?php if ( get_theme_mod('packers_agency_footer_instagram_link', 'https://www.instagram.com/') != '' && get_theme_mod('packers_agency_footer_instagram_link', 'https://www.instagram.com/') !== 'https://www.instagram.com/' ) { ?>
                    <a target="_blank" href="<?php echo esc_url(get_theme_mod('packers_agency_footer_instagram_link', 'https://www.instagram.com/')); ?>">
                        <i class="<?php echo esc_attr(get_theme_mod('packers_agency_instagram_icon', 'fa-brands fa-instagram')); ?>"></i>
                        <span class="screen-reader-text"><?php esc_html_e('Instagram', 'packers-agency'); ?></span>
                    </a>
                <?php } ?>
                <?php if ( get_theme_mod('packers_agency_footer_linkedin_link', 'https://in.linkedin.com/') != '' && get_theme_mod('packers_agency_footer_linkedin_link', 'https://in.linkedin.com/') !== 'https://in.linkedin.com/' ) { ?>
                    <a target="_blank" href="<?php echo esc_url(get_theme_mod('packers_agency_footer_linkedin_link', 'https://in.linkedin.com/')); ?>">
                        <i class="<?php echo esc_attr(get_theme_mod('packers_agency_linkedin_icon', 'fa-brands fa-linkedin')); ?>"></i>
                        <span class="screen-reader-text"><?php esc_html_e('Linkedin', 'packers-agency'); ?></span>
                    </a>
                <?php } ?>
                <?php if ( get_theme_mod('packers_agency_footer_youtube_link', 'https://www.youtube.com/') != '' && get_theme_mod('packers_agency_footer_youtube_link', 'https://www.youtube.com/') !== 'https://www.youtube.com/' ) { ?>
                    <a target="_blank" href="<?php echo esc_url(get_theme_mod('packers_agency_footer_youtube_link', 'https://www.youtube.com/')); ?>">
                        <i class="<?php echo esc_attr(get_theme_mod('packers_agency_youtube_icon', 'fa-brands fa-youtube')); ?>"></i>
                        <span class="screen-reader-text"><?php esc_html_e('Youtube', 'packers-agency'); ?></span>
                    </a>
                <?php } ?>
            </div>
        </div>
    <?php endif; ?>

    <?php if ($packers_agency_scroll_top) : ?>
        <a id="button">
            <i class="<?php echo esc_attr(get_theme_mod('packers_agency_scroll_icon', 'fas fa-arrow-up')); ?>"></i>
        </a>
    <?php endif; ?>

</footer>
</div>
</div>

<?php wp_footer(); ?>

</body>
</html>
