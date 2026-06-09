<?php
/**
 * The template for displaying search results pages.
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/#search-result
 *
 * @package packers_agency
 */

get_header(); ?>

<div id="primary" class="content-area">
    <main id="main" class="site-main" role="main">
        <div class="container">
            <div class="row">
                <?php if (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'one-column') { ?>              
                    <?php if ( have_posts() ) : ?>

                        <header class="page-header">
                            <h1 class="page-title">
                                <?php printf( esc_html__( 'Search Results', 'packers-agency' ) ); ?>
                            </h1>

                            <?php get_search_form(); ?>

                            <p class="count">
                                <?php
                                printf(
                                    esc_html__( 'Search Results for "%s"', 'packers-agency' ),
                                    '<span>' . esc_html( get_search_query() ) . '</span>'
                                );
                                ?>
                            </p>
                        </header>

                        <?php while ( have_posts() ) : the_post(); ?>
                            <?php
                            get_template_part( 'template-parts/content', get_post_format() );
                            ?>
                        <?php endwhile; ?>

                        <?php the_posts_navigation(); ?>

                    <?php else : ?>
                        <?php get_template_part( 'template-parts/content', 'none' ); ?>
                    <?php endif; ?>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'grid-layout') { ?>
                    <div class="row">
                        <?php if (have_posts()) : ?>
                            <header class="page-header">
                                <h1 class="page-title"><?php printf(esc_html__('Search Result', 'packers-agency')); ?></h1>
                                <?php get_search_form(); ?>
                                <p class="count"><?php 
                                /* translators: %s: search query */
                                printf(esc_html__('Search Results for "%s"', 'packers-agency'), '<span>' . get_search_query() . '</span>'); ?></p>
                            </header><!-- .page-header -->

                            <?php while (have_posts()) : the_post(); ?>
                                <?php get_template_part('template-parts/content-grid', get_post_format()); ?>
                            <?php endwhile; ?>

                            <?php the_posts_navigation(); ?>
                        <?php else : ?>
                            <?php get_template_part('template-parts/content', 'none'); ?>
                        <?php endif; ?>
                    </div>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'right-sidebar') { ?>
                    <div class="col-lg-9 col-md-8">
                        <div class="row">
                            <?php if (have_posts()) : ?>
                                <header class="page-header">
                                    <h1 class="page-title"><?php printf(esc_html__('Search Result', 'packers-agency')); ?></h1>
                                    <?php get_search_form(); ?>
                                    <p class="count"><?php printf(esc_html__('Search Results for "%s"', 'packers-agency'), '<span>' . get_search_query() . '</span>'); ?></p>
                                </header><!-- .page-header -->

                                <?php while (have_posts()) : the_post(); ?>
                                    <?php get_template_part('template-parts/content', get_post_format()); ?>
                                <?php endwhile; ?>

                                <?php the_posts_navigation(); ?>
                            <?php else : ?>
                                <?php get_template_part('template-parts/content', 'none'); ?>
                            <?php endif; ?>
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
                            <?php if (have_posts()) : ?>
                                <header class="page-header">
                                    <h1 class="page-title"><?php printf(esc_html__('Search Result', 'packers-agency')); ?></h1>
                                    <?php get_search_form(); ?>
                                    <p class="count"><?php printf(esc_html__('Search Results for "%s"', 'packers-agency'), '<span>' . get_search_query() . '</span>'); ?></p>
                                </header><!-- .page-header -->

                                <?php while (have_posts()) : the_post(); ?>
                                    <?php get_template_part('template-parts/content', get_post_format()); ?>
                                <?php endwhile; ?>

                                <?php the_posts_navigation(); ?>
                            <?php else : ?>
                                <?php get_template_part('template-parts/content', 'none'); ?>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php } elseif (get_theme_mod('packers_agency_post_layout_setting', 'right-sidebar') == 'three-column') { ?>
                    <div class="col-lg-3 col-md-3">
                        <?php get_sidebar(); ?>
                    </div>
                    <div class="col-lg-6 col-md-6">
                        <div class="row">
                            <?php if (have_posts()) : ?>
                                <header class="page-header">
                                    <h1 class="page-title"><?php printf(esc_html__('Search Result', 'packers-agency')); ?></h1>
                                    <?php get_search_form(); ?>
                                    <p class="count"><?php printf(esc_html__('Search Results for "%s"', 'packers-agency'), '<span>' . get_search_query() . '</span>'); ?></p>
                                </header><!-- .page-header -->

                                <?php while (have_posts()) : the_post(); ?>
                                    <?php get_template_part('template-parts/content', get_post_format()); ?>
                                <?php endwhile; ?>

                                <?php the_posts_navigation(); ?>
                            <?php else : ?>
                                <?php get_template_part('template-parts/content', 'none'); ?>
                            <?php endif; ?>
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
                            <?php if (have_posts()) : ?>
                                <header class="page-header">
                                    <h1 class="page-title"><?php printf(esc_html__('Search Result', 'packers-agency')); ?></h1>
                                    <?php get_search_form(); ?>
                                    <p class="count"><?php printf(esc_html__('Search Results for "%s"', 'packers-agency'), '<span>' . get_search_query() . '</span>'); ?></p>
                                </header><!-- .page-header -->

                                <?php while (have_posts()) : the_post(); ?>
                                    <?php get_template_part('template-parts/content', get_post_format()); ?>
                                <?php endwhile; ?>

                                <?php the_posts_navigation(); ?>
                            <?php else : ?>
                                <?php get_template_part('template-parts/content', 'none'); ?>
                            <?php endif; ?>
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