<?php
/**
 * Template part for displaying posts.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package packers_agency
 */
$packers_agency_heading_setting  = get_theme_mod( 'packers_agency_post_heading_setting' , true );
$packers_agency_meta_setting  = get_theme_mod( 'packers_agency_post_meta_setting' , true );
$packers_agency_image_setting  = get_theme_mod( 'packers_agency_post_image_setting' , true );
$packers_agency_content_setting  = get_theme_mod( 'packers_agency_post_content_setting' , true );
$packers_agency_read_more_setting = get_theme_mod( 'packers_agency_read_more_setting' , true );
$packers_agency_read_more_text = get_theme_mod( 'packers_agency_read_more_text', __( 'Read More', 'packers-agency' ) );
?>

<div class="col-lg-4 col-md-6">
	<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
    <?php 
    $packers_agency_meta_order = get_theme_mod('packers_agency_blog_meta_order', array('heading', 'author', 'featured-image', 'content', 'button'));
    
    foreach ($packers_agency_meta_order as $packers_agency_order) :
        if ('heading' === $packers_agency_order) :
            if ($packers_agency_heading_setting) { ?>
                <header class="entry-header">
                    <?php if (is_single()) {
                        the_title('<h1 class="entry-title" itemprop="headline">', '</h1>');
                    } else {
                        the_title('<h2 class="entry-title" itemprop="headline"><a href="' . esc_url(get_permalink()) . '" rel="bookmark">', '</a></h2>');
                    } ?>
                </header>
            <?php }
        endif;

        if ('author' === $packers_agency_order) :
            if ('post' === get_post_type() && $packers_agency_meta_setting) { ?>
                <div class="entry-meta">
                    <?php packers_agency_posted_on(); ?>
                </div>
            <?php }
        endif;

        if ('featured-image' === $packers_agency_order) :
            if ($packers_agency_image_setting) { ?>
                    <?php echo (!is_single()) 
                        ? '<a href="' . esc_url( get_the_permalink() ) . '" class="post-thumbnail wow fadeInUp" data-wow-delay="0.2s">'
                        : '<div class="post-thumbnail wow fadeInUp" data-wow-delay="0.2s">';
                    ?>
                    <?php if (has_post_thumbnail()) {
                        if (is_active_sidebar('right-sidebar')) {
                            the_post_thumbnail('packers-agency-with-sidebar', array('itemprop' => 'image'));
                        } else {
                            the_post_thumbnail('packers-agency-without-sidebar', array('itemprop' => 'image'));
                        }
                    } else { ?>
                        <img src="<?php echo esc_url(get_stylesheet_directory_uri() . '/images/default-header.png'); ?>">
                    <?php } ?>
                <?php echo (!is_single()) ? '</a>' : '</div>'; ?>
            <?php }
        endif;

        if ('content' === $packers_agency_order) :
            if ($packers_agency_content_setting) { ?>
                <div class="entry-content" itemprop="text">
                    <?php if (is_single()) {
                        the_content(
                            sprintf(
                                wp_kses(
                                    __('Continue reading %s <span class="meta-nav">&rarr;</span>', 'packers-agency'),
                                    array('span' => array('class' => array()))
                                ),
                                '<span class="screen-reader-text">"' . get_the_title() . '"</span>'
                            )
                        );
                    } else {
                        the_excerpt();
                    }
                    
                    wp_link_pages(array(
                        'before' => '<div class="page-links">' . esc_html__('Pages:', 'packers-agency'),
                        'after'  => '</div>',
                    ));
                    ?>
                </div>
            <?php }
        endif;

        if ('button' === $packers_agency_order) :
            if (!is_single() && $packers_agency_read_more_setting) { ?>
                <div class="read-more-button">
                    <a href="<?php echo esc_url(get_permalink()); ?>" class="read-more-button"><?php echo esc_html($packers_agency_read_more_text); ?></a>
                </div>
            <?php }
        endif;
    endforeach; ?>
</article>
</div>