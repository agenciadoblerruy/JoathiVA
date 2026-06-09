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

        <!-- Default Widget Content -->
        <div class="footer-t">
            <div class="container">
                <div class="row wow bounceInUp center delay-1000" data-wow-duration="2s">

                    <?php 
                    // Dynamic column width
                    $packers_agency_col = 12 / $packers_agency_active_areas;
                    ?>

                    <!-- Archive -->
                    <aside class="widget widget_archive col-xl-<?php echo $packers_agency_col; ?> col-lg-<?php echo $packers_agency_col; ?> col-md-6 col-sm-6">
                        <h2 class="widget-title"><?php esc_html_e('Archive List', 'packers-agency'); ?></h2>
                        <ul><?php wp_get_archives('type=monthly'); ?></ul>
                    </aside>

                    <!-- Recent Posts -->
                    <aside class="widget widget_recent_posts col-xl-<?php echo $packers_agency_col; ?> col-lg-<?php echo $packers_agency_col; ?> col-md-6 col-sm-6">
                        <h2 class="widget-title"><?php esc_html_e('Recent Posts', 'packers-agency'); ?></h2>
                        <ul>
                            <?php
                            $args = array('post_type' => 'post', 'posts_per_page' => 5);
                            $recent_posts = new WP_Query($args);
                            while ($recent_posts->have_posts()) : $recent_posts->the_post(); ?>
                                <li><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></li>
                            <?php endwhile; wp_reset_postdata(); ?>
                        </ul>
                    </aside>

                    <!-- Categories -->
                    <aside class="widget widget_categories col-xl-<?php echo $packers_agency_col; ?> col-lg-<?php echo $packers_agency_col; ?> col-md-6 col-sm-6">
                        <h2 class="widget-title"><?php esc_html_e('Categories', 'packers-agency'); ?></h2>
                        <ul><?php wp_list_categories(array('title_li' => '')); ?></ul>
                    </aside>

                    <!-- Tags -->
                    <aside class="widget widget_tags col-xl-<?php echo $packers_agency_col; ?> col-lg-<?php echo $packers_agency_col; ?> col-md-6 col-sm-6">
                        <h2 class="widget-title"><?php esc_html_e('Tags', 'packers-agency'); ?></h2>
                        <div class="tag-cloud"><?php wp_tag_cloud(); ?></div>
                    </aside>

                </div>
            </div>
        </div>

    <?php endif; ?>

    <?php do_action('packers_agency_footer'); ?>

    <?php if ( get_theme_mod('packers_agency_enable_footer_icon_section', true) ) : ?>
        <div class="footer-social-icons text-center">
            <div class="container">
                <?php if ( get_theme_mod('packers_agency_footer_facebook_link', 'https://www.facebook.com/') != '' ) { ?>
                    <a target="_blank" href="<?php echo esc_url(get_theme_mod('packers_agency_footer_facebook_link', 'https://www.facebook.com/')); ?>">
                        <i class="<?php echo esc_attr(get_theme_mod('packers_agency_facebook_icon', 'fa-brands fa-facebook')); ?>"></i>
                        <span class="screen-reader-text"><?php esc_html_e('Facebook', 'packers-agency'); ?></span>
                    </a>
                <?php } ?>
                <?php if ( get_theme_mod('packers_agency_footer_twitter_link', 'https://twitter.com/') != '' ) { ?>
                    <a target="_blank" href="<?php echo esc_url(get_theme_mod('packers_agency_footer_twitter_link', 'https://x.com/')); ?>">
                        <i class="<?php echo esc_attr(get_theme_mod('packers_agency_twitter_icon', 'fa-brands fa-twitter')); ?>"></i>
                        <span class="screen-reader-text"><?php esc_html_e('Twitter', 'packers-agency'); ?></span>
                    </a>
                <?php } ?>
                <?php if ( get_theme_mod('packers_agency_footer_instagram_link', 'https://www.instagram.com/') != '' ) { ?>
                    <a target="_blank" href="<?php echo esc_url(get_theme_mod('packers_agency_footer_instagram_link', 'https://www.instagram.com/')); ?>">
                        <i class="<?php echo esc_attr(get_theme_mod('packers_agency_instagram_icon', 'fa-brands fa-instagram')); ?>"></i>
                        <span class="screen-reader-text"><?php esc_html_e('Instagram', 'packers-agency'); ?></span>
                    </a>
                <?php } ?>
                <?php if ( get_theme_mod('packers_agency_footer_linkedin_link', 'https://in.linkedin.com/') != '' ) { ?>
                    <a target="_blank" href="<?php echo esc_url(get_theme_mod('packers_agency_footer_linkedin_link', 'https://in.linkedin.com/')); ?>">
                        <i class="<?php echo esc_attr(get_theme_mod('packers_agency_linkedin_icon', 'fa-brands fa-linkedin')); ?>"></i>
                        <span class="screen-reader-text"><?php esc_html_e('Linkedin', 'packers-agency'); ?></span>
                    </a>
                <?php } ?>
                <?php if ( get_theme_mod('packers_agency_footer_youtube_link', 'https://www.youtube.com/') != '' ) { ?>
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