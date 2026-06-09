<?php 
/**
 * Template part for displaying Featured Service Section
 *
 * @package packers_agency
 */

$packers_agency_about = get_theme_mod( 'packers_agency_about_setting', true );

if ( $packers_agency_about ) { ?>
    <div id="about-section" class="section-content py-5">
        <div class="container">
            <div class="row">
                <?php 
                $packers_agency_category_name = get_theme_mod('packers_agency_trending_post_slider_args_');
                $args = array(
                    'post_type'           => 'post',
                    'category_name'       => $packers_agency_category_name,
                    'orderby'             => 'post__in',
                    'ignore_sticky_posts' => true,
                );

                $loop = new WP_Query($args);
                $packers_agency_counter = 1;

                if ( $loop->have_posts() ) :
                    while ( $loop->have_posts() ) : $loop->the_post();
                        $packers_agency_post_class = ( $packers_agency_counter % 2 == 0 ) ? 'even-post' : 'odd-post'; ?>
                        
                        <div class="col-lg-4 col-md-6 mb-4">
                            <div class="box <?php echo esc_attr($packers_agency_post_class); ?>">
                                <div class="box-content">
                                    <?php 
                                        $packers_agency_latest_category = get_the_category();
                                        if (!empty($packers_agency_latest_category)) {
                                            echo '<a class="post-categories" href="' . esc_url(get_category_link($packers_agency_latest_category[0]->term_id)) . '">' . esc_html($packers_agency_latest_category[0]->name) . '</a>';
                                        } 
                                    ?>
                                    <h4 class="title mb-2"><?php the_title(); ?></h4>
                                    <div class="btn-green my-1">
                                        <a href="<?php the_permalink(); ?>"><?php esc_html_e('Book Now', 'packers-agency'); ?></a>
                                    </div>
                                    <?php 
                                    $packers_agency_discount_text = get_theme_mod('packers_agency_category_discount_text' . $packers_agency_counter);
                                    if (!empty($packers_agency_discount_text)) { ?>
                                        <p class="discount-text"><?php echo esc_html($packers_agency_discount_text); ?></p>
                                    <?php } ?> 
                                </div>
                                <div class="image-box wow zoomIn delay-1000" data-wow-duration="2s">
                                    <?php if ( has_post_thumbnail() ) : ?>
                                        <div class="image-blog">
                                            <?php the_post_thumbnail(); ?>
                                        </div>
                                    <?php else: ?>
                                        <div class="image-blog">
                                            <img src="<?php echo esc_url(get_stylesheet_directory_uri() . '/images/default-header.png'); ?>" alt="Default Image">
                                        </div>
                                    <?php endif; ?> 
                                    <?php 
                                    $packers_agency_discount_percentage = get_theme_mod('packers_agency_category_discounted_percentage' . $packers_agency_counter);
                                    if (!empty($packers_agency_discount_percentage)) { ?>
                                        <p class="discount-percent"><?php echo esc_html($packers_agency_discount_percentage); ?> <?php esc_html_e('OFF', 'packers-agency'); ?></p>
                                    <?php } ?>  
                                </div>
                            </div>
                        </div>
                        <?php 
                        $packers_agency_counter++;
                    endwhile;
                    wp_reset_postdata();
                endif; ?>
            </div>
        </div>
    </div>
<?php } ?>
