<?php
/**
 * The main template file.
 *
 * This is the most generic template file in a WordPress theme
 * and one of the two required files for a theme (the other being style.css).
 * It is used to display a page when nothing more specific matches a query.
 * E.g., it puts together the home page when no home.php file exists.
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
                    <div class="row">
                        <?php
                        if ( have_posts() ) :
                            if ( is_home() && ! is_front_page() ) : ?>
                                <header>
                                    <h1 class="page-title screen-reader-text">
                                        <?php single_post_title(); ?>
                                    </h1>
                                </header>
                            <?php endif;

                            while ( have_posts() ) : the_post();
                                get_template_part( 'template-parts/content', get_post_format() );
                            endwhile;
                            the_posts_pagination();
                        else :
                            get_template_part( 'template-parts/content', 'none' );
                        endif;
                        ?>
                    </div>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'grid-layout') { ?>
                    <div class="row">
                        <?php
                        if (have_posts()) :

                            if (is_home() && !is_front_page()) : ?>
                                <header>
                                    <h1 class="page-title screen-reader-text"><?php single_post_title(); ?></h1>
                                </header>
                            <?php endif;

                            /* Start the Loop */
                            while (have_posts()) : the_post();
                                get_template_part('template-parts/content-grid', get_post_format());
                            endwhile;

                            the_posts_pagination();

                        else :
                            get_template_part('template-parts/content', 'none');
                        endif;
                        ?>
                    </div>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'right-sidebar') { ?>
                    <div class="col-lg-9 col-md-8">
                        <div class="row">
                            <?php
                            if (have_posts()) :

                                if (is_home() && !is_front_page()) : ?>
                                    <header>
                                        <h1 class="page-title screen-reader-text"><?php single_post_title(); ?></h1>
                                    </header>
                                <?php endif;

                                /* Start the Loop */
                                while (have_posts()) : the_post();
                                    get_template_part('template-parts/content', get_post_format());
                                endwhile;

                                the_posts_pagination();

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
                            if (have_posts()) :

                                if (is_home() && !is_front_page()) : ?>
                                    <header>
                                        <h1 class="page-title screen-reader-text"><?php single_post_title(); ?></h1>
                                    </header>
                                <?php endif;

                                /* Start the Loop */
                                while (have_posts()) : the_post();
                                    get_template_part('template-parts/content', get_post_format());
                                endwhile;

                                the_posts_pagination();

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
                            if (have_posts()) :

                                if (is_home() && !is_front_page()) : ?>
                                    <header>
                                        <h1 class="page-title screen-reader-text"><?php single_post_title(); ?></h1>
                                    </header>
                                <?php endif;

                                /* Start the Loop */
                                while (have_posts()) : the_post();
                                    get_template_part('template-parts/content', get_post_format());
                                endwhile;

                                the_posts_pagination();

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
                            if (have_posts()) :

                                if (is_home() && !is_front_page()) : ?>
                                    <header>
                                        <h1 class="page-title screen-reader-text"><?php single_post_title(); ?></h1>
                                    </header>
                                <?php endif;

                                /* Start the Loop */
                                while (have_posts()) : the_post();
                                    get_template_part('template-parts/content', get_post_format());
                                endwhile;

                                the_posts_pagination();

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