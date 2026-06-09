<?php
/**
 * The template for displaying archive pages.
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package packers_agency
 */

get_header(); ?>

<div id="primary" class="content-area">
    <main id="main" class="site-main" role="main">
        <div class="container">
            <div class="row">
                <?php if (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'one-column') { ?>
                    <?php
                    if ( have_posts() ) :
                        while ( have_posts() ) : the_post();
                            get_template_part( 'template-parts/content', get_post_format() );
                        endwhile;
                        the_posts_navigation();
                    else :
                        get_template_part( 'template-parts/content', 'none' );
                    endif;
                    ?>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'grid-layout') { ?>
                    <div class="row">
                        <?php
                        if (have_posts()) : ?>

                            <?php
                            /* Start the Loop */
                            while (have_posts()) : the_post();
                                get_template_part('template-parts/content-grid', get_post_format());
                            endwhile;
                            the_posts_navigation();
                        else :
                            get_template_part('template-parts/content', 'none');
                        endif;
                        ?>
                    </div>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'right-sidebar') { ?>
                    <div class="col-lg-9 col-md-8">
                        <div class="row">
                            <?php
                            if (have_posts()) : ?>

                                <?php
                                /* Start the Loop */
                                while (have_posts()) : the_post();
                                    get_template_part('template-parts/content-grid', get_post_format());
                                endwhile;
                                the_posts_navigation();
                            else :
                                get_template_part('template-parts/content', 'none');
                            endif;
                            ?>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-4">
                        <?php get_sidebar(); ?>
                    </div>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'left-sidebar') { ?>
                    <div class="col-lg-3 col-md-4">
                        <?php get_sidebar(); ?>
                    </div>
                    <div class="col-lg-9 col-md-8">
                        <div class="row">
                            <?php
                            if (have_posts()) : ?>

                                <?php
                                /* Start the Loop */
                                while (have_posts()) : the_post();
                                    get_template_part('template-parts/content', get_post_format());
                                endwhile;
                                the_posts_navigation();
                            else :
                                get_template_part('template-parts/content', 'none');
                            endif;
                            ?>
                        </div>
                    </div>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'three-column') { ?>
                    <div class="col-lg-3 col-md-3">
                        <?php get_sidebar(); ?>
                    </div>
                    <div class="col-lg-6 col-md-6">
                        <div class="row">
                            <?php
                            if (have_posts()) : ?>

                                <?php
                                /* Start the Loop */
                                while (have_posts()) : the_post();
                                    get_template_part('template-parts/content', get_post_format());
                                endwhile;
                                the_posts_navigation();
                            else :
                                get_template_part('template-parts/content', 'none');
                            endif;
                            ?>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-3">
                        <aside id="secondary" class="widget-area">
                            <?php dynamic_sidebar('sidebar-2'); ?>
                        </aside>
                    </div>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'four-column') { ?>
                    <div class="col-lg-3 col-md-3">
                        <?php get_sidebar(); ?>
                    </div>
                    <div class="col-lg-3 col-md-3">
                        <aside id="secondary" class="widget-area">
                            <?php dynamic_sidebar('sidebar-2'); ?>
                        </aside>
                    </div>
                    <div class="col-lg-3 col-md-3">
                        <div class="row">
                            <?php
                            if (have_posts()) : ?>

                                <?php
                                /* Start the Loop */
                                while (have_posts()) : the_post();
                                    get_template_part('template-parts/content', get_post_format());
                                endwhile;
                                the_posts_navigation();
                            else :
                                get_template_part('template-parts/content', 'none');
                            endif;
                            ?>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-3">
                        <aside id="secondary" class="widget-area">
                            <?php dynamic_sidebar('sidebar-3'); ?>
                        </aside>
                    </div>
                <?php } ?>
            </div>
        </div>
    </main>
</div>

<?php get_footer(); ?>